export type Context = {
	userId: string;
	activeOrganizationId: string | null;
	subscription?: {
		plan: string;
		status: string;
		purchasedSeats: number;
		purchasedStorageGB: number;
	};
	usage?: {
		members: number;
		matters: number;
		teams: number;
	};
	clearUsageCache?: (
		orgId: string,
		metric?: "members" | "teams" | "matters" | "storage" | "all",
	) => void;
};

declare module "@rocicorp/zero" {
	interface DefaultTypes {
		context: Context;
	}
}
