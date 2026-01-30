import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const connectionString = process.env.ZERO_UPSTREAM_DB;

if (!connectionString) {
	throw new Error("ZERO_UPSTREAM_DB environment variable is not defined");
}

const pool = new Pool({
	connectionString,
	max: 20,
	idleTimeoutMillis: 30000,
	connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool, { schema });
