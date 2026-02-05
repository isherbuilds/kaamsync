import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import MehIcon from "lucide-react/dist/esm/icons/meh";
import {
	isRouteErrorResponse,
	Link,
	type LinkProps,
	useRouteError,
} from "react-router";
import { buttonVariants } from "~/components/ui/button";

function DevErrorDisplay({
	message,
	detail,
	stack,
}: {
	message: string;
	detail: string;
	stack?: string;
}) {
	return (
		<main className="space-y-4 p-4 sm:p-8">
			<div className="space-y-1">
				<h1 className="font-semibold text-lg">{message}</h1>
				<p className="break-words text-base text-muted-foreground">{detail}</p>
			</div>
			{stack && (
				<pre className="max-h-96 w-full overflow-x-auto overflow-y-auto rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
					<code>{stack}</code>
				</pre>
			)}
		</main>
	);
}

export function ErrorDisplay({
	message,
	detail,
}: {
	message: string;
	detail: string;
}) {
	return (
		<main className="center h-screen p-6">
			<div className="v-stack mx-auto max-w-sm items-center gap-4 text-center">
				<div className="rounded-full bg-muted p-3">
					<MehIcon className="size-6" />
				</div>

				<div className="v-stack gap-1">
					<h1 className="font-semibold text-lg">{message}</h1>
					<p className="text-base text-muted-foreground">{detail}</p>
				</div>

				<Link className={buttonVariants()} to="/">
					Back to home
				</Link>
			</div>
		</main>
	);
}

export function GeneralErrorBoundary() {
	const error = useRouteError();
	const isDev = import.meta.env.DEV;
	let message = "Oops! Application Error.";
	let details = "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message = error.status === 404 ? "404 Not Found" : "Error";
		details =
			error.status === 404
				? "The requested page could not be found."
				: error.statusText || details;
	} else if (isDev && error && error instanceof Error) {
		details = error.message;
		stack = error.stack;
	}

	if (isDev && stack) {
		return <DevErrorDisplay detail={details} message={message} stack={stack} />;
	}

	return <ErrorDisplay detail={details} message={message} />;
}

/**
 * Props for the RouteErrorBoundary component.
 */
interface RouteErrorBoundaryProps {
	/** The title to display for the error */
	title?: string;
	/** The description of the error */
	description?: string;
	/** Optional custom link to navigate to instead of current route */
	linkTo?: LinkProps["to"];
	/** Optional custom link text */
	linkText?: string;
}

/**
 * A reusable error boundary component for route-level errors.
 * Provides a consistent error display with "Try again" functionality.
 *
 * @example
 * ```tsx
 * // Basic usage
 * export function ErrorBoundary() {
 *   return <RouteErrorBoundary />;
 * }
 *
 * // With custom title and description
 * export function ErrorBoundary() {
 *   return (
 *     <RouteErrorBoundary
 *       title="Tasks Error"
 *       description="Failed to load tasks"
 *     />
 *   );
 * }
 *
 * // With custom navigation
 * export function ErrorBoundary() {
 *   return (
 *     <RouteErrorBoundary
 *       title="Not Found"
 *       linkTo="/"
 *       linkText="Go home"
 *     />
 *   );
 * }
 * ```
 */
export function RouteErrorBoundary({
	title,
	description,
	linkTo = ".",
	linkText = "Try again",
}: RouteErrorBoundaryProps = {}) {
	const error = useRouteError();
	const isDev = import.meta.env.DEV;

	let message = title ?? "Error";
	let details = description ?? "An unexpected error occurred.";
	let stack: string | undefined;

	if (isRouteErrorResponse(error)) {
		message =
			title ??
			(error.status === 404 ? "404 Not Found" : `${error.status} Error`);
		details = description ?? error.statusText ?? "Failed to load content.";
	} else if (isDev && error && error instanceof Error) {
		if (!details) {
			details = error.message;
		}
		stack = error.stack;
	}

	// Dev mode with stack trace
	if (isDev && stack) {
		return (
			<div className="center v-stack h-full gap-4 p-8">
				<div className="rounded-full bg-destructive/10 p-3">
					<AlertCircle className="size-6 text-destructive" />
				</div>
				<div className="v-stack gap-1 text-center">
					<h2 className="font-semibold text-lg">{message}</h2>
					<p className="text-muted-foreground text-sm">{details}</p>
				</div>
				<pre className="max-h-48 w-full max-w-md overflow-auto rounded-lg bg-destructive/10 p-3 text-left text-destructive text-xs">
					<code>{stack}</code>
				</pre>
				<Link
					to={linkTo}
					className="text-primary hover:underline"
					prefetch="intent"
				>
					{linkText}
				</Link>
			</div>
		);
	}

	// Production or no stack trace
	return (
		<div className="center v-stack h-full gap-4 p-8">
			<div className="rounded-full bg-muted p-3">
				<MehIcon className="size-6" />
			</div>
			<div className="v-stack gap-1 text-center">
				<h2 className="font-semibold text-lg">{message}</h2>
				<p className="text-muted-foreground text-sm">{details}</p>
			</div>
			<Link
				to={linkTo}
				className="text-primary hover:underline"
				prefetch="intent"
			>
				{linkText}
			</Link>
		</div>
	);
}
