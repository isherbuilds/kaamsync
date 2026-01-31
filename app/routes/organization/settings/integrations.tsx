import { Link, useRouteError } from "react-router";

import UnderConstruction from "~/components/shared/under-construction";
import type { Route } from "./+types/integrations";

export const meta: Route.MetaFunction = ({ params }) => [
	{
		title: `Integrations - ${params.orgSlug}`,
	},
];

export default function IntegrationsSettings() {
	return <UnderConstruction route="/integrations" />;
}

export function ErrorBoundary() {
	const error = useRouteError();

	return (
		<div className="v-stack center flex h-full gap-4 p-8">
			<h2 className="font-semibold text-lg">Integrations Error</h2>
			<p className="text-muted-foreground text-sm">
				{error instanceof Error ? error.message : "Failed to load integrations"}
			</p>
			<Link to="." className="text-primary hover:underline" prefetch="intent">
				Try again
			</Link>
		</div>
	);
}
