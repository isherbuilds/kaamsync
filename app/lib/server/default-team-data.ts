/**
 * Default labels and statuses for new teams.
 * Shared between server-side seeding and client-side mutators.
 */

export const DEFAULT_LABELS = [
	{
		name: "Task",
		color: "#3b82f6",
		description: "General tasks",
	},
	{
		name: "Improvement",
		color: "#22c55e",
		description: "Enhancements and improvements",
	},
	{
		name: "Issue",
		color: "#ef4444",
		description: "Problems and issues",
	},
	{
		name: "Finance",
		color: "#a855f7",
		description: "Financial tasks and management",
	},
	{
		name: "Support",
		color: "#10b981",
		description: "Support and operational work",
	},
] as const;

export const DEFAULT_STATUSES = [
	{
		name: "Backlog",
		color: "#94a3b8",
		type: "backlog" as const,
		position: 0,
		isDefault: false,
	},
	{
		name: "Todo",
		color: "#9ca3af",
		type: "not_started" as const,
		position: 1,
		isDefault: true,
	},
	{
		name: "In progress",
		color: "#3b82f6",
		type: "started" as const,
		position: 2,
		isDefault: false,
	},
	{
		name: "Completed",
		color: "#22c55e",
		type: "completed" as const,
		position: 3,
		isDefault: false,
	},
	{
		name: "Canceled",
		color: "#ef4444",
		type: "canceled" as const,
		position: 4,
		isDefault: false,
	},
] as const;
