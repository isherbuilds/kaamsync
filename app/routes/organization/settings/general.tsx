import { Link, useRouteError } from "react-router";

import UnderConstruction from "~/components/shared/under-construction";
import type { Route } from "./+types/general";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `General Settings - ${params.orgSlug}`,
	},
];

export default function GeneralSettings() {
	return <UnderConstruction route="/settings" />;
}

export function ErrorBoundary() {
	const error = useRouteError();

	return (
		<div className="flex h-full flex-col items-center justify-center gap-4 p-8">
			<h2 className="font-semibold text-lg">Settings Error</h2>
			<p className="text-muted-foreground text-sm">
				{error instanceof Error ? error.message : "Failed to load settings"}
			</p>
			<Link to="." className="text-primary hover:underline" prefetch="intent">
				Try again
			</Link>
		</div>
	);
}
