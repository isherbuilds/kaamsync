// Helper functions for working with organization members

// Get full member info by userId
// biome-ignore lint/suspicious/noExplicitAny: Zero query types are complex
export function getMemberInfo(
	userId: string | null | undefined,
	members: any[],
): {
	name: string;
	email: string | null;
	image: string | null;
	userId: string | null;
} {
	if (!userId) {
		return { name: "Unknown", email: null, image: null, userId: null };
	}

	const member = members.find((m) => m.userId === userId);

	return {
		name: member?.user?.name || member?.name || member?.userId || "Unknown",
		email: member?.user?.email || member?.email || null,
		image: member?.user?.image || member?.image || null,
		userId: member?.userId || userId,
	};
}
