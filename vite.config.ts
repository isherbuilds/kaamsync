import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	build: {
		outDir: "build/client",
	},

	plugins: [
		tailwindcss(),
		{
			...babel({
				filter: /\.(ts|tsx)$/,
				babelConfig: {
					presets: ["@babel/preset-typescript"],
					plugins: ["babel-plugin-react-compiler"],
				},
			}),
			apply: "build",
		},
		reactRouter(),
		VitePWA({
			registerType: "autoUpdate",
			strategies: "injectManifest",
			srcDir: "app",
			filename: "service-worker.ts",
			injectRegister: "inline",
			injectManifest: {
				// Pre-cache built client assets and html; exclude dev/HMR modules.
				globDirectory: "build/client",
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp,txt}"],
			},
			devOptions: {
				enabled: false, // use `vite build && vite preview` to test SW; avoids dev HMR noise
				type: "module",
			},
			manifest: {
				name: "KaamSync",
				short_name: "KaamSync",
				start_url: "/",
				display: "standalone",
				background_color: "#0f172a",
				theme_color: "#0f172a",
				icons: [
					{
						src: "/favicon.ico",
						sizes: "48x48",
						type: "image/x-icon",
					},
				],
			},
		}),
		tsconfigPaths(),
	],
	optimizeDeps: {
		include: [
			"clsx",
			"react-router",
			"react-router/dom",
			"react-router/internal/react-server-client",
			"tailwind-merge",
		],
	},
});
