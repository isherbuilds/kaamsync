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
	invalidateUsageCache?: (orgId: string) => void;
};

declare module "@rocicorp/zero" {
	interface DefaultTypes {
		context: Context;
	}
}
