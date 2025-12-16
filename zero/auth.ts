export type Context = {
	userId: string;
	activeOrganizationId: string | null;
};

declare module "@rocicorp/zero" {
	interface DefaultTypes {
		context: Context;
	}
}
