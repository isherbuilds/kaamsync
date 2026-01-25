import { useFormAction, useNavigation } from "react-router";

/**
 * Hook to check if a form submission is currently pending.
 *
 * Useful for showing loading states on submit buttons or disabling form inputs
 * during submission.
 *
 * @param options - Configuration for matching the pending navigation
 * @param options.formAction - The form action URL to match (defaults to current form action)
 * @param options.formMethod - The HTTP method to match (defaults to "POST")
 * @param options.state - The navigation state to check ("submitting", "loading", or "non-idle")
 * @returns `true` if the form is currently pending, `false` otherwise
 *
 * @example
 * ```tsx
 * const isPending = useIsPending({ formMethod: "POST" });
 * return <Button disabled={isPending}>Submit</Button>;
 * ```
 */
export function useIsPending({
	formAction,
	formMethod = "POST",
	state = "non-idle",
}: {
	formAction?: string;
	formMethod?: "POST" | "GET" | "PUT" | "PATCH" | "DELETE";
	state?: "submitting" | "loading" | "non-idle";
} = {}): boolean {
	const contextualFormAction = useFormAction();
	const navigation = useNavigation();

	const isMatchingState =
		state === "non-idle"
			? navigation.state !== "idle"
			: navigation.state === state;

	const isMatchingAction =
		navigation.formAction === (formAction ?? contextualFormAction);
	const isMatchingMethod = navigation.formMethod === formMethod;

	return isMatchingState && isMatchingAction && isMatchingMethod;
}
