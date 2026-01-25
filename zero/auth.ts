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
	clearUsageCache?: (orgId: string) => void;
	sendNotification?: (
		userId: string,
		title: string,
		body: string,
		url?: string,
	) => Promise<void>;
};

declare module "@rocicorp/zero" {
	interface DefaultTypes {
		context: Context;
	}
}
