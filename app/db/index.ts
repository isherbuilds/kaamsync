import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { getEnv } from "~/lib/env";
import * as schema from "./schema";

const dbUrl = getEnv("ZERO_UPSTREAM_DB");

if (!dbUrl && typeof process !== "undefined") {
	throw new Error("ZERO_UPSTREAM_DB environment variable is not defined");
}

const pool = new Pool({
	connectionString: dbUrl,
});

export const db = drizzle(pool, { schema });
