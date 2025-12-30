import type { Transaction } from "@rocicorp/zero";
import type { Schema } from "./schema"; // Ensure this matches your schema export name

export type MutatorTx = Transaction<Schema>;

/**
 * Allocate short ID for new matter.
 * Handles both client-side (optimistic) and server-side (authoritative) allocation.
 */
export async function allocateShortID(
	tx: MutatorTx,
	workspaceId: string,
	baseInsert: any, 
	clientShortID?: number,
) {
	if (tx.location !== "server") {
		// --- CLIENT SIDE ---
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

	// --- SERVER SIDE ---
	// 1. Try client-provided ID first
	if (Number.isFinite(clientShortID) && (clientShortID as number) > 0) {
		const existing = await tx.dbTransaction.query(
			"SELECT 1 FROM matters WHERE workspace_id = $1 AND short_id = $2 LIMIT 1",
			[workspaceId, clientShortID],
		);
		
		const rows = Array.from(existing as unknown as Array<unknown>);
		if (rows.length === 0) {
			await tx.mutate.mattersTable.insert({
				...baseInsert,
				shortID: clientShortID as number,
			});
			// Sync the workspace counter
			await tx.dbTransaction.query(
				"UPDATE workspaces SET next_short_id = GREATEST(next_short_id, $2 + 1) WHERE id = $1",
				[workspaceId, clientShortID],
			);
			return;
		}
	}

	// 2. Generate new ID with retry on conflict (max 3 attempts)
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
			return; // Success, exit function
		} catch (err) {
			const isUniqueConstraintError = /unique|duplicate|constraint/i.test(
				err instanceof Error ? err.message : String(err),
			);
			
			if (isUniqueConstraintError && attempt < 2) {
				continue; // Try again
			}
			
			throw new Error(
				`Failed to allocate short ID after ${attempt + 1} attempts: ${err}`,
			);
		}
	}
}