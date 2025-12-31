import {
	getFormProps,
	getInputProps,
	type SubmissionResult,
	useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { useState } from "react";
import { data, Form, href, redirect, useNavigation } from "react-router";
import { toast } from "sonner";
import { BasicLayout } from "~/components/basic-layout";
import { InputField, InputGroupField, LoadingButton } from "~/components/forms";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { AppInfo } from "~/lib/app-config";
import { auth, getServerSession } from "~/lib/auth";
import { getOrganization } from "~/lib/server/organization.server";
import { seedTeamDefaults } from "~/lib/server/seed-defaults.server";
import { sanitizeSlug } from "~/lib/utils";
import { orgOnboardingSchema } from "~/lib/validations/organization";
import type { Route } from "./+types/join";

export const meta: Route.MetaFunction = () => [
	{ title: `Join - ${AppInfo.name}` },
];

export async function loader({ request }: Route.LoaderArgs) {
	const session = await getServerSession(request);

	if (!session) {
		return redirect("/login");
	}

	const invitations = await auth.api.listUserInvitations({
		query: { email: session.user.email },
	});

	if (!invitations?.length) {
		return [];
	}

	// Collect unique orgIds
	const orgIds = [...new Set(invitations.map((inv) => inv.organizationId))];

	// Fetch organizations if needed
	const organizations = orgIds.length
		? (await Promise.all(orgIds.map((id) => getOrganization(id)))).filter(
				(org) => org !== null,
			)
		: [];

	const orgInfoById = Object.fromEntries(
		organizations.map((org) => [org.id, { name: org.name, slug: org.slug }]),
	);

	return invitations.map((invite) => ({
		...invite,
		organizationName: orgInfoById[invite.organizationId]?.name ?? "",
		organizationSlug: orgInfoById[invite.organizationId]?.slug ?? "",
	}));
}

export async function action({ request }: Route.ActionArgs) {
	const session = await getServerSession(request);

	if (!session) {
		return redirect("/login?callbackURL=/join");
	}

	const formData = await request.formData();
	const submission = await parseWithZod(formData, {
		schema: orgOnboardingSchema.superRefine(async (formValues, ctx) => {
			if (formValues.intent === "create") {
				const uniqueSlug = await auth.api.checkOrganizationSlug({
					body: {
						slug: formValues.slug,
					},
				});

				if (!uniqueSlug) {
					ctx.addIssue({
						path: ["slug"],
						code: "custom",
						message: "URL already exists.",
					});
					return;
				}
			}
		}),
		async: true,
	});

	if (submission.status !== "success") {
		return data(
			{ result: submission.reply() },
			// biome-ig
			{ status: submission.status === "error" ? 400 : 200 },
			// toast.error("Invalid form data.")
		);
	}

	switch (submission.value.intent) {
		case "create": {
			const { name, slug } = submission.value;
			try {
				const newOrg = await auth.api.createOrganization({
					body: {
						name,
						slug,
						userId: session.user.id,
					},
				});

				if (!newOrg) {
					toast.error("Organization creation failed.");
					return null;
				}

				await seedTeamDefaults({
					orgId: newOrg.id,
				});

				return redirect(href("/:orgSlug/tasks", { orgSlug: newOrg.slug }));
			} catch {
				// toast.message(`Organization creation failed. ${err}`);
				toast.error("Organization creation failed.");
				return null;
			}
		}

		case "join": {
			const { invitationId, joinOrgSlug } = submission.value;

			// Use our Convex acceptInvitation which handles team memberships
			const result = await auth.api.acceptInvitation({
				body: {
					invitationId,
				},
				headers: request.headers,
			});

			if (!result) {
				return toast.error("Failed to accept invitation.");
			}

			// After joining, redirect to home (sidebar will show new org/teams)
			return redirect(`/${joinOrgSlug}/tasks`);
		}

		default:
			return toast.error("Invalid form values.");
	}
}

export default function onboardingOrganization({
	loaderData,
	actionData,
}: Route.ComponentProps) {
	const userInvites = loaderData;

	const typed = actionData as
		| { result?: SubmissionResult<string[]> }
		| undefined;

	const [form, fields] = useForm({
		lastResult: typed?.result,
		onValidate({ formData }) {
			// Only synchronous validation here; async checks must be done server-side
			return parseWithZod(formData, { schema: orgOnboardingSchema });
		},
		constraint: getZodConstraint(orgOnboardingSchema),
		shouldRevalidate: "onBlur",
	});

	const [orgSlugField, setOrgSlugField] = useState("");

	const navigation = useNavigation();
	const isPending = navigation.state !== "idle";

	const showJoin = userInvites && userInvites.length > 0;

	return (
		<BasicLayout
			description="Create or join an organization to continue."
			title="Welcome 👋"
		>
			<Tabs className="w-full" defaultValue={showJoin ? "join" : "create"}>
				<TabsList className="grid w-full grid-cols-2">
					<TabsTrigger value="create">Create</TabsTrigger>
					<TabsTrigger value="join">
						Join
						{userInvites && userInvites.length > 0 && (
							<span className="rounded-full bg-primary px-2 py-0.5 text-primary-foreground text-xs">
								{userInvites.length}
							</span>
						)}
					</TabsTrigger>
				</TabsList>

				<TabsContent value="create">
					<Form
						className="grid gap-4"
						method="POST"
						{...getFormProps(form)}
						onSubmit={form.onSubmit}
					>
						<InputField
							errors={fields.name.errors}
							inputProps={{
								...getInputProps(fields.name, { type: "text" }),
								placeholder: "epic work",
								// enterKeyHint: "next",
								autoFocus: true,
								onBlur: (e) => {
									if (orgSlugField.length === 0) {
										setOrgSlugField(sanitizeSlug(e.target.value));
									}
								},
							}}
							labelProps={{ children: "Org Name" }}
						/>
						<InputGroupField
							errors={fields.slug.errors}
							groupText="https://example.com/"
							inputProps={{
								...getInputProps(fields.slug, { type: "text" }),
								placeholder: "epic-work",
								className: "!pl-0.5",
								value: orgSlugField,
								onChange: (e) => {
									setOrgSlugField(e.target.value);
								},
								onBlur: (e) => {
									const sanitized = sanitizeSlug(e.target.value);
									setOrgSlugField(sanitized);
								},
							}}
						/>
						<input name="intent" type="hidden" value="create" />
						<LoadingButton
							buttonText="Create"
							isPending={isPending}
							loadingText="Creating..."
						/>
					</Form>
				</TabsContent>
				<TabsContent value="join">
					{!showJoin && (
						<div className="empty-state py-12 text-center">
							<div className="mx-auto flex flex-col items-center gap-2">
								<h3 className="font-semibold text-lg">
									No pending invitations
								</h3>
								<p className="max-w-sm text-muted-foreground text-sm">
									Ask an organization admin to invite you by email, or create
									your own organization.
								</p>
							</div>
						</div>
					)}
					{showJoin && (
						<div className="grid gap-3">
							{userInvites?.map((invite) => (
								<Form
									key={invite.id}
									method="POST"
									{...getFormProps(form)}
									className="card-section-sm rounded-lg transition-colors hover:border-primary/50"
								>
									<div className="flex items-start justify-between gap-4">
										<div className="min-w-0 flex-1">
											<h3 className="truncate font-semibold">
												{invite.organizationName || "Organization"}
											</h3>
											<div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
												<p className="text-muted-foreground text-sm">
													Role:{" "}
													<span className="font-medium text-foreground">
														{invite.role || "member"}
													</span>
												</p>
												<p className="text-muted-foreground text-xs">
													Expires:{" "}
													{new Date(invite.expiresAt).toLocaleDateString()}
												</p>
											</div>
										</div>
										<div className="shrink-0">
											<input name="intent" type="hidden" value="join" />
											<input
												{...getInputProps(fields.invitationId, {
													type: "hidden",
												})}
												value={invite.id}
											/>
											<input
												{...getInputProps(fields.joinOrgSlug, {
													type: "hidden",
												})}
												value={invite.organizationSlug}
											/>
											<LoadingButton
												buttonText="Accept"
												form={form.id}
												isPending={isPending}
												loadingText="Accepting..."
												size="sm"
											/>
										</div>
									</div>
								</Form>
							))}
						</div>
					)}
				</TabsContent>
			</Tabs>
		</BasicLayout>
	);
}
