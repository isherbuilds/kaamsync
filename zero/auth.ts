export type Context = {
	userId: string;
	activeOrganizationId: string | null;
	invalidateUsageCache?: (orgId: string) => void;
};

declare module "@rocicorp/zero" {
	interface DefaultTypes {
		context: Context;
	}
}
