// zero/db-provider.ts
import { zeroDrizzle } from "@rocicorp/zero/server/adapters/drizzle";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as drizzleSchema from "~/db/schema/index"; // Your Drizzle schema
import { schema as zeroSchema } from "./schema"; // Generated Zero schema

if (!process.env.ZERO_UPSTREAM_DB) {
	throw new Error("ZERO_UPSTREAM_DB environment variable is not defined");
}

const pool = new Pool({
	connectionString: process.env.ZERO_UPSTREAM_DB,
});

export const drizzleClient = drizzle(pool, { schema: drizzleSchema });
export const dbProvider = zeroDrizzle(zeroSchema, drizzleClient);

// Export the DrizzleTransaction type
// export type DrizzleTransaction = Parameters<
// 	Parameters<typeof drizzleClient.transaction>[0]
// >[0];

// Register the database provider for type safety
declare module "@rocicorp/zero" {
	interface DefaultTypes {
		dbProvider: typeof dbProvider;
	}
}
