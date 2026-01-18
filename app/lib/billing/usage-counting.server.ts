import { and, eq, sql } from "drizzle-orm";
import { db } from "~/db";
import {
	attachmentsTable,
	mattersTable,
	membersTable,
	storageUsageCacheTable,
	teamsTable,
} from "~/db/schema";

export interface OrganizationUsage {
	members: number;
	teams: number;
	matters: number;
	storageBytes: number;
	storageGb: number;
	fileCount: number;
	calculatedAt: Date;
}

export type UsageType = "members" | "teams" | "matters" | "storage";

export interface UsageChangeEvent {
	orgId: string;
	eventType: string;
	quantity: number;
	metadata?: Record<string, unknown>;
}

const USAGE_CACHE_TTL_MS = 5 * 60 * 1000;

const usageCache = new Map<
	string,
	{ data: OrganizationUsage; timestamp: number }
>();

function isCacheFresh(timestamp: Date): boolean {
	return Date.now() - timestamp.getTime() < USAGE_CACHE_TTL_MS;
}

async function getUsageCache(orgId: string): Promise<OrganizationUsage | null> {
	const cached = usageCache.get(orgId);
	if (cached && isCacheFresh(cached.data.calculatedAt)) {
		return cached.data;
	}
	return null;
}

async function updateUsageCache(
	orgId: string,
	usage: OrganizationUsage,
): Promise<void> {
	usageCache.set(orgId, { data: usage, timestamp: Date.now() });
}

async function updateOrganizationsUsageJsonb(
	orgId: string,
	usage: OrganizationUsage,
): Promise<void> {
	await db.execute(
		sql`
		UPDATE organizations_table
		SET usage = ${JSON.stringify({
			members: usage.members,
			teams: usage.teams,
			matters: usage.matters,
			storageBytes: usage.storageBytes,
		})},
			updated_at = NOW()
		WHERE id = ${orgId}
		`,
	);
}

async function getMatterCountFromCache(orgId: string): Promise<number> {
	const cached = usageCache.get(orgId);
	if (cached && isCacheFresh(cached.data.calculatedAt)) {
		return cached.data.matters;
	}
	const result = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(mattersTable)
		.where(
			and(
				eq(mattersTable.orgId, orgId),
				sql`${mattersTable.deletedAt} IS NULL`,
			),
		);
	return result[0]?.count ?? 0;
}

export async function getAccurateUsage(
	orgId: string,
): Promise<OrganizationUsage> {
	const cached = await getUsageCache(orgId);
	if (cached) {
		return cached;
	}

	const [members, teams, matters, storage] = await Promise.all([
		db
			.select({ count: sql<number>`COUNT(*)` })
			.from(membersTable)
			.where(eq(membersTable.organizationId, orgId)),

		db
			.select({ count: sql<number>`COUNT(*)` })
			.from(teamsTable)
			.where(eq(teamsTable.orgId, orgId)),

		db
			.select({ count: sql<number>`COUNT(*)` })
			.from(mattersTable)
			.where(
				and(
					eq(mattersTable.orgId, orgId),
					sql`${mattersTable.deletedAt} IS NULL`,
				),
			),

		db
			.select({
				totalBytes: sql<number>`COALESCE(SUM(${attachmentsTable.fileSize}), 0)::bigint`,
				fileCount: sql<number>`COUNT(*)`,
			})
			.from(attachmentsTable)
			.where(eq(attachmentsTable.orgId, orgId)),
	]);

	const usage: OrganizationUsage = {
		members: members[0]?.count ?? 0,
		teams: teams[0]?.count ?? 0,
		matters: matters[0]?.count ?? 0,
		storageBytes: Number(storage[0]?.totalBytes ?? 0n),
		storageGb: Number(storage[0]?.totalBytes ?? 0n) / (1024 * 1024 * 1024),
		fileCount: storage[0]?.fileCount ?? 0,
		calculatedAt: new Date(),
	};

	await updateUsageCache(orgId, usage);
	await updateOrganizationsUsageJsonb(orgId, usage);

	return usage;
}

export async function getQuickUsage(orgId: string): Promise<{
	members: number;
	teams: number;
	matters: number;
}> {
	const [members, teams] = await Promise.all([
		db
			.select({ count: sql<number>`COUNT(*)` })
			.from(membersTable)
			.where(eq(membersTable.organizationId, orgId)),

		db
			.select({ count: sql<number>`COUNT(*)` })
			.from(teamsTable)
			.where(eq(teamsTable.orgId, orgId)),
	]);

	return {
		members: members[0]?.count ?? 0,
		teams: teams[0]?.count ?? 0,
		matters: await getMatterCountFromCache(orgId),
	};
}

export async function getMemberCount(orgId: string): Promise<number> {
	const result = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(membersTable)
		.where(eq(membersTable.organizationId, orgId));

	return result[0]?.count ?? 0;
}

export async function getTeamCount(orgId: string): Promise<number> {
	const result = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(teamsTable)
		.where(eq(teamsTable.orgId, orgId));

	return result[0]?.count ?? 0;
}

export async function getMatterCount(orgId: string): Promise<number> {
	const result = await db
		.select({ count: sql<number>`COUNT(*)` })
		.from(mattersTable)
		.where(
			and(
				eq(mattersTable.orgId, orgId),
				sql`${mattersTable.deletedAt} IS NULL`,
			),
		);

	return result[0]?.count ?? 0;
}

export async function getStorageUsage(orgId: string): Promise<{
	totalBytes: number;
	totalGb: number;
	fileCount: number;
}> {
	const cached = await db.query.storageUsageCacheTable.findFirst({
		where: eq(storageUsageCacheTable.orgId, orgId),
	});

	if (cached && isCacheFresh(cached.updatedAt)) {
		return {
			totalBytes: Number(cached.totalBytes),
			totalGb: Number(cached.totalBytes) / (1024 * 1024 * 1024),
			fileCount: cached.fileCount,
		};
	}

	const result = await db
		.select({
			totalBytes: sql<number>`COALESCE(SUM(${attachmentsTable.fileSize}), 0)::bigint`,
			fileCount: sql<number>`COUNT(*)`,
		})
		.from(attachmentsTable)
		.where(eq(attachmentsTable.orgId, orgId));

	const totalBytes = Number(result[0]?.totalBytes ?? 0n);
	const fileCount = result[0]?.fileCount ?? 0;

	await db.execute(
		sql`
		INSERT INTO storage_usage_cache (org_id, total_bytes, file_count, updated_at)
		VALUES (${orgId}, ${BigInt(totalBytes)}, ${fileCount}, NOW())
		ON CONFLICT (org_id) DO UPDATE SET
			total_bytes = ${BigInt(totalBytes)},
			file_count = ${fileCount},
			updated_at = NOW()
		`,
	);

	return {
		totalBytes,
		totalGb: totalBytes / (1024 * 1024 * 1024),
		fileCount,
	};
}

export async function incrementUsage(
	orgId: string,
	type: UsageType,
	quantity: number = 1,
): Promise<void> {
	const field = {
		members: "members",
		teams: "teams",
		matters: "matters",
		storage: "storageBytes",
	}[type];

	if (type === "storage") {
		await db.execute(
			sql`
			INSERT INTO storage_usage_cache (org_id, total_bytes, file_count, updated_at)
			VALUES (${orgId}, ${quantity}, 1, NOW())
			ON CONFLICT (org_id) DO UPDATE SET
				total_bytes = storage_usage_cache.total_bytes + ${quantity},
				file_count = storage_usage_cache.file_count + 1,
				updated_at = NOW()
		`,
		);
	} else {
		await db.execute(
			sql`
			UPDATE organizations_table
			SET usage = jsonb_set(
				COALESCE(usage, '{}'::jsonb),
				${field},
				to_jsonb(GREATEST(0, COALESCE((usage->>${field})::bigint, 0) + ${quantity})),
				true
			),
			updated_at = NOW()
			WHERE id = ${orgId}
		`,
		);
	}

	invalidateUsageCache(orgId);
}

export async function decrementUsage(
	orgId: string,
	type: UsageType,
	quantity: number = 1,
): Promise<void> {
	const field = {
		members: "members",
		teams: "teams",
		matters: "matters",
		storage: "storageBytes",
	}[type];

	if (type === "storage") {
		await db.execute(
			sql`
			INSERT INTO storage_usage_cache (org_id, total_bytes, file_count, updated_at)
			VALUES (${orgId}, 0, 0, NOW())
			ON CONFLICT (org_id) DO UPDATE SET
				total_bytes = GREATEST(0, storage_usage_cache.total_bytes - ${quantity}),
				file_count = GREATEST(0, storage_usage_cache.file_count - 1),
				updated_at = NOW()
		`,
		);
	} else {
		await db.execute(
			sql`
			UPDATE organizations_table
			SET usage = jsonb_set(
				COALESCE(usage, '{}'::jsonb),
				${field},
				to_jsonb(GREATEST(0, COALESCE((usage->>${field})::bigint, 0) - ${quantity})),
				true
			),
			updated_at = NOW()
			WHERE id = ${orgId}
		`,
		);
	}

	invalidateUsageCache(orgId);
}

export function invalidateUsageCache(orgId: string): void {
	usageCache.delete(orgId);
}

export function invalidateAllUsageCache(): void {
	usageCache.clear();
}

export async function invalidateUsageCacheInDb(orgId: string): Promise<void> {
	await db.execute(
		sql`DELETE FROM storage_usage_cache WHERE org_id = ${orgId}`,
	);
}
