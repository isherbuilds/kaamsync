import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

const pgURL = process.env.ZERO_UPSTREAM_DB as string;

export const db = drizzle(pgURL, { schema });
