import { Link, useRouteError } from "react-router";

import type { Route } from "./+types/teams.$teamCode";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Team ${params.teamCode}`,
	},
];

export default function TeamTeamCode() {
	return (
		<div>
			<h1>Unknown Route</h1>
		</div>
	);
}

export function ErrorBoundary() {
	const error = useRouteError();

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 p-8">
			<h2 className="font-semibold text-lg">Team Error</h2>
			<p className="text-muted-foreground text-sm">
				{error instanceof Error ? error.message : "Failed to load team"}
			</p>
			<Link to="." className="text-primary hover:underline" prefetch="intent">
				Try again
			</Link>
		</div>
	);
}
