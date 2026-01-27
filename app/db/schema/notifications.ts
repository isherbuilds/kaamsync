import { index, pgTable, text, uniqueIndex } from "drizzle-orm/pg-core";
import { commonColumns } from "../helpers";
import { usersTable } from "./auth";

export const pushSubscriptionsTable = pgTable(
	"push_subscriptions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id, { onDelete: "cascade" }),
		endpoint: text("endpoint").notNull(),
		p256dh: text("p256dh").notNull(),
		auth: text("auth").notNull(),
		userAgent: text("user_agent"),
		...commonColumns,
	},
	(table) => [
		index("push_subscriptions_user_idx").on(table.userId),
		uniqueIndex("push_subscriptions_endpoint_unique").on(table.endpoint),
	],
);
