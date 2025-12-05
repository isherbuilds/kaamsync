import { defineConfig } from "drizzle-kit";
import { must } from "./shared/must";
import "./shared/env";

const pgURL = must(
	process.env.ZERO_UPSTREAM_DB,
	"ZERO_UPSTREAM_DB is required",
);
// const pgURL = "postgresql://postgres:your_dev_password@localhost:5432/postgres";

export default defineConfig({
	schema: "./app/db/schema/index.ts",
	dialect: "postgresql",
	out: "./database/migrations",
	strict: true,
	dbCredentials: {
		url: pgURL,
	},
});
