import { planLimits } from "../app/lib/billing/plans";
import type { MutatorTx } from "./mutator-helpers";

export async function assertCanCreateMatter(tx: MutatorTx, orgId: string) {
	if (tx.location !== "server") return;

	const result = await tx.dbTransaction.query(
		`UPDATE organizations_table
      SET usage = jsonb_set(
        COALESCE(usage, '{}'::jsonb),
        '{matters}',
        to_jsonb(GREATEST(0, COALESCE((usage->>'matters')::int, 0) + 1)),
        true
      )
      FROM (
        SELECT plan_key
        FROM subscriptions
        WHERE organization_id = $1
          AND status = 'active'
          AND (current_period_end IS NULL OR current_period_end > NOW())
        LIMIT 1
      ) s
      WHERE id = $1
        AND (
          (s.plan_key IS NULL OR s.plan_key = 'starter' AND COALESCE((usage->>'matters')::int, 0) < $2)
          OR (s.plan_key IS NOT NULL AND s.plan_key <> 'starter')
        )
      RETURNING usage->>'matters' as count, s.plan_key as plan`,
		[orgId, planLimits.starter.matters],
	);

	const rows = Array.from(
		result as unknown as Array<{ count: number; plan: string | null }>,
	);

	if (rows.length === 0) {
		throw new Error(
			`Matter limit reached. Your starter plan allows ${planLimits.starter.matters} matters. Please upgrade for unlimited.`,
		);
	}
}

export async function adjustOrgMatterUsage(
	tx: MutatorTx,
	orgId: string,
	delta: number,
) {
	if (tx.location !== "server") return;

	await tx.dbTransaction.query(
		`UPDATE organizations_table
     SET usage = jsonb_set(
       COALESCE(usage, '{}'::jsonb),
       '{matters}',
       to_jsonb(GREATEST(0, COALESCE((usage->>'matters')::int, 0) + $1)),
       true
     )
     WHERE id = $2`,
		[delta, orgId],
	);
}
