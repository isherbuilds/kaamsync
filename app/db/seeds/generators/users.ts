import { faker } from "@faker-js/faker";
import { eq } from "drizzle-orm";
import { db } from "~/db";
import { usersTable } from "~/db/schema/auth";
import { auth } from "~/lib/auth/server";

export async function createUser(name?: string, suffix?: string) {
	// ... (createUser remains same)
	const firstName = faker.person.firstName();
	const lastName = faker.person.lastName();
	const email = faker.internet.email({ firstName, lastName }).toLowerCase();

	let displayName = name || `${firstName} ${lastName}`;
	if (suffix) displayName += ` (${suffix})`;

	const r = await auth.api.signUpEmail({
		body: {
			email,
			password: "password",
			name: displayName,
			image: `https://i.pravatar.cc/150?u=${email}`,
		},
	});

	if (r && typeof (r as any).user === "object" && (r as any).user.id) {
		return (r as any).user as typeof usersTable.$inferSelect;
	}
	return null;
}

export async function createUsers(count: number, suffix?: string) {
	console.log(`👥 Creating ${count} users${suffix ? ` for ${suffix}` : ""}...`);
	const users = [];
	for (let i = 0; i < count; i++) {
		const user = await createUser(undefined, suffix);
		if (user) users.push(user);
	}
	console.log(`✅ Created ${users.length} users successfully`);
	return users;
}

export async function createAdminUser() {
	console.log("👤 Creating Admin user...");

	const email = "admin@kaamsync.com";

	// Try to sign up
	await auth.api
		.signUpEmail({
			body: {
				email,
				password: "password", // Known password
				name: "Avery Patel (Platform Admin)",
				image: `https://i.pravatar.cc/150?u=${email}`,
			},
		})
		.catch((e) => {
			console.error("Failed to seed admin user:", e);
		});

	// Fetch the user to ensure we return the correct one (whether created now or before)
	const users = await db
		.select()
		.from(usersTable)
		.where(eq(usersTable.email, email))
		.limit(1);

	if (users.length > 0) {
		return users[0];
	}

	console.error("❌ Failed to create or retrieve Admin User!");
	return null;
}
