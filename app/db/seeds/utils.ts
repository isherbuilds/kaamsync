import { db } from "~/db/index";

export const randomDate = (start: Date, end: Date): Date =>
	new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

export const randomPick = <T>(arr: T[]): T =>
	arr[Math.floor(Math.random() * arr.length)];

export const randomPickMultiple = <T>(arr: T[], count: number): T[] => {
	const shuffled = [...arr].sort(() => 0.5 - Math.random());
	return shuffled.slice(0, Math.min(count, arr.length));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function batchInsert<T>(
	table: any,
	values: T[],
	batchSize: number = 500,
): Promise<void> {
	if (values.length === 0) return;
	for (let i = 0; i < values.length; i += batchSize) {
		await db
			.insert(table)
			.values(values.slice(i, i + batchSize))
			.onConflictDoNothing();
	}
}
