import type { Transaction } from "@rocicorp/zero";
import type { MattersTable, Schema } from "../schema";

export type MutatorTx = Transaction<Schema>;

/** Server-side transaction with dbTransaction access */
type ServerMutatorTx = Extract<MutatorTx, { location: "server" }>;

/** Base matter insert data, excluding shortID which is assigned separately */
type MatterInsertBase = Omit<Partial<MattersTable>, "shortID"> &
	Pick<
		MattersTable,
		| "id"
		| "teamId"
		| "orgId"
		| "authorId"
		| "statusId"
		| "title"
		| "type"
		| "teamCode"
		| "createdAt"
		| "updatedAt"
	>;

/**
 * Check if a value is a valid positive short ID
 */
function isValidShortId(value: number | undefined): value is number {
	return Number.isFinite(value) && (value as number) > 0;
}

/**
 * Insert matter with short ID on client side (optimistic).
 * Uses provided clientShortID if valid, otherwise defaults to 0.
 */
async function assignClientSideShortId(
	tx: MutatorTx,
	baseInsert: MatterInsertBase,
	clientShortID: number | undefined,
): Promise<void> {
	const shortID = isValidShortId(clientShortID) ? clientShortID : 0;

	await tx.mutate.mattersTable.insert({
		...baseInsert,
		shortID,
	});
}

/**
 * Try to use client-provided short ID on server if it's available.
 * Returns true if successful, false if ID is already taken.
 */
async function tryClientProvidedShortId(
	tx: ServerMutatorTx,
	teamId: string,
	baseInsert: MatterInsertBase,
	clientShortID: number,
): Promise<boolean> {
	const existing = await tx.dbTransaction.query(
		"SELECT 1 FROM matters WHERE team_id = $1 AND short_id = $2 LIMIT 1",
		[teamId, clientShortID],
	);

	const rows = Array.from(existing as unknown as Array<unknown>);
	if (rows.length > 0) {
		return false;
	}

	await tx.mutate.mattersTable.insert({
		...baseInsert,
		shortID: clientShortID,
	});

	await tx.dbTransaction.query(
		"UPDATE teams SET next_short_id = GREATEST(next_short_id, $2 + 1) WHERE id = $1",
		[teamId, clientShortID],
	);

	return true;
}

/**
 * Allocate a new short ID on server side with retry on conflict.
 * Queries for the next available ID and updates the team counter.
 */
async function allocateServerSideShortId(
	tx: ServerMutatorTx,
	teamId: string,
	baseInsert: MatterInsertBase,
): Promise<void> {
	try {
		// Atomic reservation of short ID
		const result = await tx.dbTransaction.query(
			"UPDATE teams SET next_short_id = next_short_id + 1 WHERE id = $1 RETURNING next_short_id",
			[teamId],
		);
		const rows = Array.from(
			result as unknown as Array<{ next_short_id: number }>,
		);
		const nextShortIdState = rows[0]?.next_short_id;

		if (!nextShortIdState) {
			throw new Error(`Failed to allocate short ID: Team ${teamId} not found`);
		}

		// The reserved ID is the one we just stepped over (new state - 1)
		const reservedId = nextShortIdState - 1;

		await tx.mutate.mattersTable.insert({
			...baseInsert,
			shortID: reservedId,
		});

		return;
	} catch (err) {
		throw new Error(`Failed to allocate short ID: ${err}`);
	}
}

/**
 * Assign short ID to a new matter.
 * Handles both client-side (optimistic) and server-side (authoritative) allocation.
 */
export async function assignMatterShortId(
	tx: MutatorTx,
	teamId: string,
	baseInsert: MatterInsertBase,
	clientShortID?: number,
): Promise<void> {
	if (tx.location !== "server") {
		await assignClientSideShortId(tx, baseInsert, clientShortID);
		return;
	}

	if (isValidShortId(clientShortID)) {
		const success = await tryClientProvidedShortId(
			tx,
			teamId,
			baseInsert,
			clientShortID,
		);
		if (success) {
			return;
		}
	}

	await allocateServerSideShortId(tx, teamId, baseInsert);
}
