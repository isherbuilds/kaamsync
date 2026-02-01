import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import { VitePWA } from "vite-plugin-pwa";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	// server: {
	// 	allowedHosts: ["kaamsync.gapple.in"],
	// },

	build: {
		outDir: "build/client",
		minify: true,
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
		visualizer({
			filename: "bundle-stats.html",
			gzipSize: true,
			brotliSize: true,
			template: "list",
			emitFile: true,
		}),
		VitePWA({
			registerType: "autoUpdate",
			strategies: "injectManifest",
			srcDir: "app",
			filename: "service-worker.ts",
			manifestFilename: "site.webmanifest",
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
				name: "KaamSync",
				short_name: "Kaam",
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
			// Pre-bundle common Zero modules
			"@rocicorp/zero/react",
		],
		// Explicitly exclude server-only deps
		exclude: [
			"@aws-sdk/client-s3",
			"@aws-sdk/s3-request-presigner",
			"@react-email/components",
			"web-push",
			"dodopayments",
			"pg",
		],
	},
});
