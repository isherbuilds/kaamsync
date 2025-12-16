export type Context = {
	userId: string;
	activeOrganizationId: string | null;
};

export function assertIsLoggedIn(ctx: Context): asserts ctx {
	if (!ctx.userId) {
		throw new Error("User must be logged in to perform this action.");
	}
}

export function assertHasWorkspace(ctx: Context): asserts ctx {
	if (!ctx.userId && !ctx.activeOrganizationId) {
		throw new Error(
			"User must have an active workspace to perform this action.",
		);
	}
}

declare module "@rocicorp/zero" {
	interface DefaultTypes {
		context: Context;
	}
}
