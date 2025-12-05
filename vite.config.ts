import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import babel from "vite-plugin-babel";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
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
