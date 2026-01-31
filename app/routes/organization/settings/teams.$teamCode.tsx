import { Link, Outlet, useRouteError } from "react-router";

import type { Route } from "./+types/teams.$teamCode";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Team ${params.teamCode}`,
	},
];

export default function TeamTeamCode() {
	return <Outlet />;
}

export function ErrorBoundary() {
	const error = useRouteError();

	return (
		<div className="v-stack center flex h-full gap-4 p-8">
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
