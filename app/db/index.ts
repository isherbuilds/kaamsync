import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { env } from "~/lib/env";
import * as schema from "./schema";

const pool = new Pool({
	connectionString: env.ZERO_UPSTREAM_DB,
});

export const db = drizzle(pool, { schema });
