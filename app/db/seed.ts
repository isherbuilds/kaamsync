import "dotenv/config";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { db } from "~/db";
import { teamsTable } from "~/db/schema/teams";
import { heroIndustry, heroShowcaseMatters } from "./seeds/data/hero";
import { industries } from "./seeds/data/industries";
import {
	createMatters,
	createShowcaseMatters,
} from "./seeds/generators/matters";
import { createOrganization } from "./seeds/generators/organizations";
import { createAdminUser, createUsers } from "./seeds/generators/users";

const MATTERS_PER_INDUSTRY = 1500; // Reduced to prevent timeouts

export async function seed() {
	console.log("🌱 Starting modular database seed...");
	const startTime = Date.now();
	const seedPreset = process.env.SEED_PRESET ?? "full";

	// 0. Create Admin User (Fixed login)
	const adminUser = await createAdminUser();
	console.log("👤 Created Admin User");

	// 1. Create Shared Users Pool
	// These users will belong to multiple organizations randomly
	const sharedPool = await createUsers(10, "Shared User");
	// Ensure admin is part of the shared pool so they get added to orgs
	const sharedUsers = [adminUser, ...sharedPool].filter(Boolean);
	console.log("✅ Created shared users pool");

	// Global set of team codes to ensure uniqueness across industries
	const globalUsedCodes = new Set<string>();

	// Pre-populate with existing codes from DB to avoid collisions on re-seed
	const existingTeams = await db
		.select({ code: teamsTable.code })
		.from(teamsTable);
	for (const w of existingTeams) {
		if (w.code) globalUsedCodes.add(w.code);
	}
	console.log(`🔍 Found ${globalUsedCodes.size} existing team codes`);

	let totalMatters = 0;

	if (seedPreset === "hero") {
		console.log("🎯 Seeding hero showcase data...");
		const { teams } = await createOrganization(
			heroIndustry,
			sharedUsers as any[],
			globalUsedCodes,
		);

		for (const team of teams) {
			const showcaseMatters = heroShowcaseMatters[team.code] ?? [];
			if (showcaseMatters.length) {
				await createShowcaseMatters(team, showcaseMatters);
			} else {
				await createMatters(team, 12);
			}
		}

		const duration = (Date.now() - startTime) / 1000;
		console.log(`\n🎉 Hero seed completed in ${duration.toFixed(2)}s`);
		return;
	}

	// 2. Loop through Industries
	for (const industryConfig of industries) {
		console.log(`\n🚀 Processing Industry: ${industryConfig.industry}`);

		const { teams } = await createOrganization(
			industryConfig,
			sharedUsers as any[],
			globalUsedCodes,
		);

		// Distribute matters across teams
		const mattersPerTeam = Math.floor(MATTERS_PER_INDUSTRY / teams.length);

		for (const team of teams) {
			await createMatters(team, mattersPerTeam);
			totalMatters += mattersPerTeam;
		}
	}

	const duration = (Date.now() - startTime) / 1000;
	console.log(`\n🎉 Seed completed in ${duration.toFixed(2)}s`);
	console.log(`📊 Total Matters Created: ${totalMatters}`);
	console.log(`🏢 Total Industries: ${industries.length}`);
}

// Execute if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
	seed()
		.catch((error) => {
			console.error("❌ Seed failed:", error);
			process.exit(1);
		})
		.finally(() => {
			process.exit(0);
		});
}
