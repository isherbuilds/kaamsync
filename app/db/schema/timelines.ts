import {
	boolean,
	index,
	pgTable,
	text,
	timestamp,
	varchar,
} from "drizzle-orm/pg-core";
import { commonColumns } from "../helpers";
import { usersTable } from "./auth";
import { mattersTable } from "./matters";

export const timelinesTable = pgTable(
	"timelines",
	{
		id: text("id").primaryKey(),
		matterId: text("matter_id")
			.notNull()
			.references(() => mattersTable.id, { onDelete: "cascade" }),
		userId: text("user_id")
			.notNull()
			.references(() => usersTable.id),
		type: varchar("type", { length: 50 }).notNull(),
		content: text("content"),
		fromStatusId: text("from_status_id"),
		toStatusId: text("to_status_id"),
		fromAssigneeId: text("from_assignee_id"),
		toAssigneeId: text("to_assignee_id"),
		labelId: text("label_id"),
		fromValue: text("from_value"),
		toValue: text("to_value"),
		mentions: text("mentions"),
		edited: boolean("edited"),
		editedAt: timestamp("edited_at", { withTimezone: true }),
		...commonColumns,
	},
	(table) => [
		index("timelines_matter_created_idx").on(table.matterId, table.createdAt),
		index("timelines_user_idx").on(table.userId),
	],
);
