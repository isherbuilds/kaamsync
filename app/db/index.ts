import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

// const pgURL = process.env.ZERO_UPSTREAM_DB as string;

if (!process.env.ZERO_UPSTREAM_DB) {
	throw new Error("ZERO_UPSTREAM_DB environment variable is not defined");
}

const pool = new Pool({
	connectionString: process.env.ZERO_UPSTREAM_DB,
});

export const db = drizzle(pool, { schema });
