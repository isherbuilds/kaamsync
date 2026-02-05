import {
	getFormProps,
	getInputProps,
	type SubmissionResult,
	useForm,
} from "@conform-to/react";
import { getZodConstraint, parseWithZod } from "@conform-to/zod/v4";
import { data, Form, Link, redirect, useRouteError } from "react-router";
import { toast } from "sonner";
import { BasicLayout } from "~/components/layout/basic-layout";
import { LoadingButton, PasswordField } from "~/components/shared/forms";
import { AppInfo } from "~/config/app";
import { useIsPending } from "~/hooks/use-is-pending";
import { authClient } from "~/lib/auth/client";
import { resetPasswordSchema } from "~/lib/auth/validations";
import type { Route } from "./+types/reset-password";

export const meta: Route.MetaFunction = () => {
	return [{ title: `Password Reset - ${AppInfo.name}` }];
};

export async function loader({ request }: Route.LoaderArgs) {
	const url = new URL(request.url);
	const token = url.searchParams.get("token");

	if (!token) return redirect("/login");

	return data({ token });
}

export async function clientAction({ request }: Route.ClientActionArgs) {
	const formData = await request.formData();
	const submission = parseWithZod(formData, { schema: resetPasswordSchema });

	if (submission.status !== "success") {
		return submission.reply();
	}

	const { error } = await authClient.resetPassword({
		newPassword: submission.value.newPassword,
		token: submission.value.token,
	});

	if (error) {
		return toast.error(error.message || "An unexpected error occurred.");
	}

	toast.success("Password reset successfully! Please sign in again.");
	return redirect("/login");
}

export default function ResetPasswordRoute({
	loaderData: { token },
	actionData,
}: Route.ComponentProps) {
	const lastResult = actionData as SubmissionResult<string[]> | undefined;
	const [form, fields] = useForm({
		lastResult,
		onValidate({ formData }) {
			return parseWithZod(formData, { schema: resetPasswordSchema });
		},
		constraint: getZodConstraint(resetPasswordSchema),
		shouldRevalidate: "onInput",
	});

	const isPending = useIsPending({
		formMethod: "POST",
	});

	return (
		<BasicLayout
			title="Reset your password"
			description="Choose a new password with at least 8 characters."
		>
			<Form method="post" className="grid gap-4" {...getFormProps(form)}>
				<input type="hidden" name="token" value={token} />
				<PasswordField
					labelProps={{ children: "New Password" }}
					inputProps={{
						...getInputProps(fields.newPassword, { type: "password" }),
						autoFocus: true,
						enterKeyHint: "next",
					}}
					errors={fields.newPassword.errors}
				/>
				<PasswordField
					labelProps={{ children: "Confirm New Password" }}
					inputProps={{
						...getInputProps(fields.confirmPassword, { type: "password" }),
						enterKeyHint: "done",
					}}
					errors={fields.confirmPassword.errors}
				/>
				<LoadingButton
					buttonText="Reset Password"
					loadingText="Resetting password..."
					isPending={isPending}
				/>
			</Form>

			<div className="text-center text-sm">
				<Link to="/login" className="text-primary hover:underline">
					← Back to sign in
				</Link>
			</div>
		</BasicLayout>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();

	return (
		<div className="p-6 text-center">
			<h2 className="mb-2 font-semibold text-lg">Reset Password Error</h2>
			<p className="mb-4 text-muted-foreground text-sm">
				{error instanceof Error ? error.message : "An error occurred"}
			</p>
			<Link
				to="/login"
				className="text-primary hover:underline"
				prefetch="intent"
			>
				Back to login
			</Link>
		</div>
	);
}
