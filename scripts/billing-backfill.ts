import "dotenv/config"; // Ensure env vars are loaded
import { db } from "~/db";
import { organizationsTable } from "~/db/schema";
import { getAccurateUsage } from "~/lib/billing/usage-counting.server";
import { UsageService } from "~/services/billing/usage.server";

async function main() {
	console.log("Starting billing backfill...");

	const orgs = await db.select().from(organizationsTable);
	console.log(`Found ${orgs.length} organizations to process.`);

	for (const org of orgs) {
		console.log(`Processing org: ${org.name} (${org.id})`);

		const usage = await getAccurateUsage(org.id);

		const currentUsage = await UsageService.getUsage(org.id);

		const metrics: Record<string, number> = {
			members: usage.members,
			teams: usage.teams,
			matters: usage.matters,
			storage_bytes: usage.storageBytes,
			files: usage.fileCount,
		};

		for (const [metric, value] of Object.entries(metrics)) {
			const current = currentUsage[metric] || 0;
			const delta = value - current;

			if (delta !== 0) {
				console.log(`  -> ${metric}: ${current} -> ${value} (delta: ${delta})`);
				await UsageService.increment(
					org.id,
					metric,
					delta,
					"migration_backfill",
				);
			}
		}
	}

	console.log("Backfill complete.");
	process.exit(0);
}

main().catch((err) => {
	console.error("Backfill failed:", err);
	process.exit(1);
});
