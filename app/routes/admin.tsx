import {
	type ActionFunctionArgs,
	data,
	Form,
	type LoaderFunctionArgs,
	redirect,
	useLoaderData,
	useNavigation,
} from "react-router";
import { auth } from "~/lib/auth/auth.server";

export async function loader({ request }: LoaderFunctionArgs) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session) {
		return redirect("/auth/sign-in");
	}

	// RBAC Check
	if (session.user.role !== "admin") {
		return redirect("/dashboard");
	}

	const users = await auth.api.listUsers({
		headers: request.headers,
		query: {
			limit: 100,
		},
	});

	return { users: users.users, session };
}

export async function action({ request }: ActionFunctionArgs) {
	const session = await auth.api.getSession({ headers: request.headers });
	if (!session || session.user.role !== "admin") {
		return data({ error: "Unauthorized" }, { status: 403 });
	}

	const formData = await request.formData();
	const intent = formData.get("intent");
	const userId = formData.get("userId") as string;

	if (!userId) return data({ error: "User ID required" }, { status: 400 });

	try {
		if (intent === "ban") {
			await auth.api.banUser({
				headers: request.headers,
				body: { userId, banReason: "Admin action" },
			});
		} else if (intent === "unban") {
			await auth.api.unbanUser({
				headers: request.headers,
				body: { userId },
			});
		} else if (intent === "set_role") {
			const role = formData.get("role") as "admin" | "user";
			await auth.api.setRole({
				headers: request.headers,
				body: { userId, role },
			});
		}
		return data({ success: true });
	} catch (_e) {
		return data({ error: "Action failed" }, { status: 500 });
	}
}

export default function AdminDashboard() {
	const { users } = useLoaderData<typeof loader>();
	const navigation = useNavigation();
	const isSubmitting = navigation.state === "submitting";

	return (
		<div className="container mx-auto px-4 py-10">
			<h1 className="mb-6 font-bold text-3xl">Admin Dashboard</h1>

			<div className="overflow-hidden rounded-lg bg-white shadow">
				<div className="border-b px-6 py-4">
					<h2 className="font-medium text-gray-900 text-lg">
						Users ({users.length})
					</h2>
				</div>
				<div className="overflow-x-auto">
					<table className="min-w-full divide-y divide-gray-200">
						<thead className="bg-gray-50">
							<tr>
								<th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
									Name
								</th>
								<th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
									Email
								</th>
								<th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
									Role
								</th>
								<th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
									Status
								</th>
								<th className="px-6 py-3 text-left font-medium text-gray-500 text-xs uppercase tracking-wider">
									Actions
								</th>
							</tr>
						</thead>
						<tbody className="divide-y divide-gray-200 bg-white">
							{users.map((user) => (
								<tr key={user.id}>
									<td className="whitespace-nowrap px-6 py-4">
										<div className="flex items-center">
											{user.image && (
												<img
													className="mr-3 h-8 w-8 rounded-full"
													src={user.image}
													alt=""
												/>
											)}
											<span className="font-medium text-gray-900 text-sm">
												{user.name}
											</span>
										</div>
									</td>
									<td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
										{user.email}
									</td>
									<td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
										<span
											className={`inline-flex rounded-full px-2 font-semibold text-xs leading-5 ${
												user.role === "admin"
													? "bg-purple-100 text-purple-800"
													: "bg-green-100 text-green-800"
											}`}
										>
											{user.role || "user"}
										</span>
									</td>
									<td className="whitespace-nowrap px-6 py-4 text-gray-500 text-sm">
										{user.banned ? (
											<span className="font-bold text-red-600">Banned</span>
										) : (
											<span className="text-green-600">Active</span>
										)}
									</td>
									<td className="space-x-2 whitespace-nowrap px-6 py-4 font-medium text-sm">
										<Form method="post" className="inline-block">
											<input type="hidden" name="userId" value={user.id} />
											{user.banned ? (
												<button
													type="submit"
													name="intent"
													value="unban"
													disabled={isSubmitting}
													className="text-green-600 hover:text-green-900 disabled:opacity-50"
												>
													Unban
												</button>
											) : (
												<button
													type="submit"
													name="intent"
													value="ban"
													disabled={isSubmitting}
													className="text-red-600 hover:text-red-900 disabled:opacity-50"
												>
													Ban
												</button>
											)}
										</Form>
										{user.role !== "admin" && (
											<Form method="post" className="ml-4 inline-block">
												<input type="hidden" name="userId" value={user.id} />
												<input type="hidden" name="role" value="admin" />
												<button
													type="submit"
													name="intent"
													value="set_role"
													disabled={isSubmitting}
													className="text-blue-600 hover:text-blue-900 disabled:opacity-50"
												>
													Make Admin
												</button>
											</Form>
										)}
										{user.role === "admin" && (
											<Form method="post" className="ml-4 inline-block">
												<input type="hidden" name="userId" value={user.id} />
												<input type="hidden" name="role" value="user" />
												<button
													type="submit"
													name="intent"
													value="set_role"
													disabled={isSubmitting}
													className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
												>
													Remove Admin
												</button>
											</Form>
										)}
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</div>
	);
}
