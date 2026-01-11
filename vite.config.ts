import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	build: {
		outDir: "build/client",
		// Optimize assets for better performance
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
			manifestFilename: "manifest.webmanifest",
			injectRegister: false,
			injectManifest: {
				// Pre-cache built client assets and html; exclude dev/HMR modules.
				globDirectory: "build/client",
				globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,webp,txt}"],
			},
			devOptions: {
				enabled: false, // `vite build && vite preview` to test SW; avoids dev HMR noise
				type: "module",
			},
			manifest: {
				name: "KaamSync - Organize Your Work Seamlessly",
				short_name: "KaamSync",
				start_url: "/",
				display: "standalone",
				background_color: "#ffffff",
				theme_color: "#ffffff",
				icons: [
					{
						src: "/web-app-manifest-192x192.png",
						sizes: "192x192",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "/web-app-manifest-512x512.png",
						sizes: "512x512",
						type: "image/png",
						purpose: "maskable",
					},
					{
						src: "/favicon-96x96.png",
						sizes: "96x96",
						type: "image/png",
					},
					{
						src: "/favicon.svg",
						sizes: "any",
						type: "image/svg+xml",
					},
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
