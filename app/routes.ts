import {
	index,
	layout,
	prefix,
	type RouteConfig,
	route,
} from "@react-router/dev/routes";

export default [
	// Marketing pages with shared layout
	layout("routes/marketing/layout.tsx", [
		index("routes/marketing/home.tsx"),
		route("pricing", "routes/marketing/pricing.tsx"),
		route("about", "routes/marketing/about.tsx"),
		route("contact", "routes/marketing/contact.tsx"),
	]),

	route("join", "routes/join.tsx"),

	layout("routes/organization/layout.tsx", [
		route(":orgSlug", "routes/organization/tasks.tsx", {
			id: "routes/organization/$orgSlug",
		}),
		route(":orgSlug/tasks", "routes/organization/tasks.tsx", [
			route("matter/:matterKey", "routes/organization/matter.$matterKey.tsx", {
				id: "routes/organization/$orgSlug/tasks/matter/:matterKey",
			}),
		]),
		route(":orgSlug/requests", "routes/organization/requests.tsx", [
			route("matter/:matterKey", "routes/organization/matter.$matterKey.tsx", {
				id: "routes/organization/$orgSlug/requests/matter/:matterKey",
			}),
		]),

		route(":orgSlug/:workspaceCode", "routes/organization/$workspaceCode.tsx"),
		route(
			":orgSlug/matter/:matterKey",
			"routes/organization/matter.$matterKey.tsx",
		),

		// Organization Settings
		route(":orgSlug/settings", "routes/organization/settings/layout.tsx", [
			index("routes/organization/settings/general.tsx"),
			route("members", "routes/organization/settings/members.tsx"),
			route("billing", "routes/organization/settings/billing.tsx"),
			route("integrations", "routes/organization/settings/integrations.tsx"),
			route(
				"workspaces/:workspaceCode",
				"routes/organization/settings/workspaces.$workspaceCode.tsx",
			),
			route(
				"workspaces/:workspaceCode/members",
				"routes/organization/settings/workspaces.$workspaceCode.members.tsx",
			),
		]),
	]),

	...prefix("api", [
		route("auth/*", "routes/api/auth/better.ts"),
		route("auth/error", "routes/api/auth/better-error.tsx"),
		route("zero/query", "routes/api/zero/query.ts"),
		route("zero/mutate", "routes/api/zero/mutate.ts"),
		route("color-scheme", "routes/api/color-scheme.ts"),
	]),

	layout("routes/auth/layout.tsx", [
		route("login", "routes/auth/login.tsx"),
		route("signup", "routes/auth/signup.tsx"),
		route("logout", "routes/auth/logout.tsx"),
		// route("forget-password", "routes/auth/forget-password.tsx"),
	]),
] satisfies RouteConfig;
