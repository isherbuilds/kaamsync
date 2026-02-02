import { getFormProps, getInputProps, useForm } from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { Form, Link, redirect, useNavigation } from "react-router";
import { toast } from "sonner";
import { BasicLayout } from "~/components/layout/basic-layout";
import {
	InputField,
	LoadingButton,
	PasswordField,
} from "~/components/shared/forms";
import { Button } from "~/components/ui/button";
import { AppInfo, SOCIAL_PROVIDER_CONFIGS } from "~/config/app";
import { type AuthSession, authClient } from "~/lib/auth/client";
import { saveAuthSessionToLocalStorage } from "~/lib/auth/offline";
import { signInSchema } from "~/lib/auth/validations";
import { safeError } from "~/lib/utils/logger";
import type { Route } from "./+types/login";

export const meta: Route.MetaFunction = () => [
	{ title: `Sign In - ${AppInfo.name}` },
];

export async function clientAction({ request }: Route.ClientActionArgs) {
	const formData = await request.clone().formData();
	const submission = parseWithZod(formData, { schema: signInSchema });

	if (submission.status !== "success") {
		return toast.error("Invalid form data.");
	}

	switch (submission.value.provider) {
		case "sign-in": {
			const { email, password } = submission.value;
			const { error, data } = await authClient.signIn.email({
				email,
				password,
			});
			if (error) {
				return toast.error(error.message || "Sign in failed.");
			}

			// Cache session immediately for faster middleware lookup
			// The signIn response already contains session data
			if (data && "session" in data) {
				saveAuthSessionToLocalStorage(data as unknown as AuthSession);
			} else {
				// Fallback: fetch session if not in response
				try {
					const session = await authClient.getSession();
					if (session.data) {
						saveAuthSessionToLocalStorage(session.data);
					}
				} catch (e) {
					safeError(e, "Failed to cache session");
				}
			}
			break;
		}

		case "google": {
			const { provider } = submission.value;
			const { error } = await authClient.signIn.social({
				provider,
				callbackURL: "/",
			});
			if (error) {
				return toast.error(error.message || `${provider} sign in failed.`);
			}
			break;
		}

		default:
			return toast.error("Invalid login method.");
	}

	return redirect("/");
}

export default function SignInRoute() {
	const [form, fields] = useForm({
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: signInSchema });
		},
		constraint: getZodConstraint(signInSchema),
		shouldRevalidate: "onInput",
	});

	const navigation = useNavigation();
	// const [lastMethod, setLastMethod] = useState<string | null>(null);

	const isPending = (provider: string) =>
		navigation.formData?.get("provider") === provider &&
		navigation.state !== "idle";
	const isSignInPending = isPending("sign-in");

	// useEffect(() => {
	// 	const lastMethod = authClient.getLastUsedLoginMethod();
	// 	setLastMethod(lastMethod);
	// }, []);

	return (
		<BasicLayout
			description="Welcome back! Please sign in to continue."
			title="Sign in to your account"
		>
			{/* Sign in form */}
			<Form className="grid gap-4" method="POST" {...getFormProps(form)}>
				<InputField
					errors={fields.email.errors}
					inputProps={{
						...getInputProps(fields.email, { type: "email" }),
						placeholder: "john@doe.com",
						autoComplete: "email",
						enterKeyHint: "next",
						autoFocus: true,
					}}
					labelProps={{ children: "Email" }}
				/>
				<PasswordField
					errors={fields.password.errors}
					inputProps={{
						...getInputProps(fields.password, { type: "password" }),
						placeholder: "••••••••••",
						autoComplete: "current-password",
						enterKeyHint: "done",
					}}
					labelProps={{
						className: "flex items-center justify-between",
						children: (
							<>
								<span>Password</span>
								<Link
									className="font-normal text-muted-foreground hover:underline"
									to="/forget-password"
									prefetch="intent"
								>
									Forgot your password?
								</Link>
							</>
						),
					}}
				/>
				<input name="provider" type="hidden" value="sign-in" />
				{/* <div className="relative overflow-hidden rounded-lg"> */}
				<LoadingButton
					className="w-full"
					buttonText="Sign In"
					loadingText="Signing in..."
					isPending={isSignInPending}
				/>
				{/* {lastMethod === "email" && (
						<span className="absolute top-0 right-0 rounded-bl-md bg-blue-400 px-2 py-0.5 text-xs text-white capitalize">
							Last used
						</span>
					)}
				</div> */}
			</Form>

			<div className="relative text-center text-xs after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-border after:border-t">
				<span className="relative z-10 bg-background px-2 text-muted-foreground">
					Or continue with
				</span>
			</div>

			{/* Social login */}
			{SOCIAL_PROVIDER_CONFIGS.length > 0 && (
				<div className="grid gap-2">
					{SOCIAL_PROVIDER_CONFIGS.map((config) => (
						<Form key={config.id} method="POST">
							<input name="provider" type="hidden" value={config.id} />
							<Button
								className="relative w-full overflow-hidden"
								disabled={isPending(config.id)}
								variant="outline"
							>
								<config.icon className="size-4" />
								<span>
									Login with <span className="capitalize">{config.name}</span>
								</span>

								{/* {lastMethod === config.id && (
									<span className="absolute top-0 right-0 rounded-bl-md bg-blue-50 px-2 py-0.5 text-xs text-blue-500 capitalize dark:bg-muted dark:text-white">
										Last used
									</span>
								)} */}
							</Button>
						</Form>
					))}
				</div>
			)}

			{/* Sign up */}
			<div className="text-center text-sm">
				Don&apos;t have an account?{" "}
				<Link
					className="text-primary hover:underline"
					to="/signup"
					prefetch="intent"
				>
					Sign up
				</Link>
			</div>
		</BasicLayout>
	);
}

export function ErrorBoundary() {
	return (
		<div className="p-6 text-center">
			<h2 className="mb-2 font-semibold text-lg">Sign In Error</h2>
			<p className="mb-4 text-muted-foreground text-sm">
				An error occurred while loading the sign in page.
			</p>
			<Link
				to="/login"
				className="text-primary hover:underline"
				prefetch="intent"
			>
				Try again
			</Link>
		</div>
	);
}
