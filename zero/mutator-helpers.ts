import type { Transaction } from "@rocicorp/zero";
import type { schema } from "./schema";

export type MutatorTx = Transaction<typeof schema>;

/**
 * Allocate short ID for new matter.
 * Handles both client-side (optimistic) and server-side (authoritative) allocation.
 */
export async function allocateShortID(
	tx: MutatorTx,
	workspaceId: string,
	baseInsert: any, // Using any for flexibility with the insert object, strict typing can be added if needed
	clientShortID?: number,
): Promise<void> {
	if (tx.location !== "server") {
		// Client: use client-provided shortID from cache or fallback to 0
		const shortID =
			Number.isFinite(clientShortID) && (clientShortID as number) > 0
				? (clientShortID as number)
				: 0;
		await tx.mutate.mattersTable.insert({
			...baseInsert,
			shortID,
		});
		return;
	}

	// Server: Try client-provided ID first, then generate with retry
	if (Number.isFinite(clientShortID) && (clientShortID as number) > 0) {
		try {
			await tx.mutate.mattersTable.insert({
				...baseInsert,
				shortID: clientShortID as number,
			});
			await tx.dbTransaction.query(
				"UPDATE workspaces SET next_short_id = next_short_id + 1 WHERE id = $1",
				[workspaceId],
			);
			return;
		} catch (err) {
			const isUnique = /unique|duplicate|constraint/i.test(
				err instanceof Error ? err.message : String(err),
			);
			if (!isUnique) throw err;
			// Fall through to retry logic
		}
	}

	// Generate new ID with retry on conflict (max 3 attempts)
	for (let attempt = 0; attempt < 3; attempt++) {
		try {
			const result = await tx.dbTransaction.query(
				"SELECT COALESCE(MAX(short_id), 0) + 1 AS next FROM matters WHERE workspace_id = $1",
				[workspaceId],
			);
			const rows = Array.from(result as unknown as Array<{ next: number }>);
			const nextShortID = rows[0]?.next ?? 1;

			await tx.mutate.mattersTable.insert({
				...baseInsert,
				shortID: nextShortID,
			});
			await tx.dbTransaction.query(
				"UPDATE workspaces SET next_short_id = next_short_id + 1 WHERE id = $1",
				[workspaceId],
			);
			return;
		} catch (err) {
			const isUnique = /unique|duplicate|constraint/i.test(
				err instanceof Error ? err.message : String(err),
			);
			if (isUnique && attempt < 2) continue; // Retry
			throw new Error(
				`Failed to allocate short ID after ${attempt + 1} attempts: ${err}`,
			);
		}
	}
}
