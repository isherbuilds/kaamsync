import { eq } from "drizzle-orm";
import { db } from "~/db/index";
import { membersTable, organizationsTable } from "~/db/schema/index";

export async function getActiveOrganization(
	userId: string,
): Promise<string | undefined> {
	// First, check if user has memberships
	const memberships = await db
		.select()
		.from(membersTable)
		.where(eq(membersTable.userId, userId))
		.limit(1);

	return memberships?.[0]?.organizationId;
}

export async function getOrganization(organizationId: string): Promise<{
	id: string;
	name: string;
	slug: string;
	logo: string | null;
	createdAt: Date;
	metadata: string | null;
} | null> {
	const organization = await db.query.organizationsTable.findFirst({
		where: eq(organizationsTable.id, organizationId),
	});

	return organization ?? null;
}
