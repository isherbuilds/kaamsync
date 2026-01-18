import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "~/db";
import { UsageService } from "./usage.server";

const { mockTx, mockDb } = vi.hoisted(() => {
	const mockTx = {
		insert: vi.fn().mockReturnThis(),
		values: vi.fn().mockReturnThis(),
		onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
	};

	const mockDb = {
		transaction: vi.fn((cb) => cb(mockTx)),
		select: vi.fn().mockReturnThis(),
		from: vi.fn().mockReturnThis(),
		where: vi.fn().mockResolvedValue([]),
	};

	return { mockTx, mockDb };
});

vi.mock("~/db", () => ({
	db: mockDb,
}));

describe("UsageService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("increment", () => {
		it("should execute a transaction", async () => {
			await UsageService.increment("org_1", "members", 1, "test_reason");
			expect(db.transaction).toHaveBeenCalled();
		});

		it("should insert into ledger and cache", async () => {
			await UsageService.increment("org_1", "members", 1, "test_reason");
			expect(mockTx.insert).toHaveBeenCalledTimes(2);
			expect(mockTx.values).toHaveBeenCalledTimes(2);
			expect(mockTx.onConflictDoUpdate).toHaveBeenCalledTimes(1);
		});
	});

	describe("getUsage", () => {
		it("should retrieve usage map", async () => {
			mockDb.where.mockResolvedValueOnce([
				{ metric: "members", count: 5 },
				{ metric: "storage_bytes", count: 1024 },
			]);

			const usage = await UsageService.getUsage("org_1");
			expect(usage).toEqual({
				members: 5,
				storage_bytes: 1024,
			});
		});
	});

	describe("getMetric", () => {
		it("should retrieve specific metric", async () => {
			const mockLimit = vi.fn().mockResolvedValue([{ count: 10 }]);
			mockDb.where.mockReturnValue({ limit: mockLimit });

			const count = await UsageService.getMetric("org_1", "members");
			expect(count).toBe(10);
		});

		it("should return 0 if no record found", async () => {
			const mockLimit = vi.fn().mockResolvedValue([]);
			mockDb.where.mockReturnValue({ limit: mockLimit });

			const count = await UsageService.getMetric("org_1", "members");
			expect(count).toBe(0);
		});
	});
});
