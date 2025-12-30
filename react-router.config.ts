import type { Config } from "@react-router/dev/config";

export default {
	// Config options...
	// Server-side render by default, to enable SPA mode set this to `false`
	ssr: true,

	prerender: ["/", "/login", "/signup", "/about", "/contact", "/pricing"],

	routeDiscovery: { mode: "initial" },

	future: {
		v8_middleware: true,
		unstable_optimizeDeps: true,
		v8_splitRouteModules: true,
		v8_viteEnvironmentApi: true,
	},
} satisfies Config;
