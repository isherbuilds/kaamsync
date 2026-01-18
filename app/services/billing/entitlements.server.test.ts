import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "~/db";
import { EntitlementService } from "./entitlements.server";
import { UsageService } from "./usage.server";

vi.mock("./usage.server");
vi.mock("~/db", () => ({
	db: {
		query: {
			organizationsTable: {
				findFirst: vi.fn(),
			},
		},
	},
}));

describe("EntitlementService", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("check", () => {
		it("should default to starter plan if org not found", async () => {
			// @ts-expect-error
			db.query.organizationsTable.findFirst.mockResolvedValue(null);
			// @ts-expect-error
			UsageService.getMetric.mockResolvedValue(0);

			const result = await EntitlementService.check("org_1", "members");
			expect(result.allowed).toBe(true);
		});

		it("should return allowed if limit is -1 (unlimited)", async () => {
			// @ts-expect-error
			db.query.organizationsTable.findFirst.mockResolvedValue({
				planKey: "enterprise",
			});
			// @ts-expect-error
			UsageService.getMetric.mockResolvedValue(1000);

			const result = await EntitlementService.check("org_1", "members");
			expect(result.allowed).toBe(true);
		});

		it("should return denied if usage exceeds limit", async () => {
			// @ts-expect-error
			db.query.organizationsTable.findFirst.mockResolvedValue({
				planKey: "starter",
			});
			// @ts-expect-error
			UsageService.getMetric.mockResolvedValue(3);

			const result = await EntitlementService.check("org_1", "members");
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain("Limit reached");
		});

		it("should handle storage limit in bytes", async () => {
			// @ts-expect-error
			db.query.organizationsTable.findFirst.mockResolvedValue({
				planKey: "starter",
			});
			const limitBytes = 0.5 * 1024 * 1024 * 1024;
			// @ts-expect-error
			UsageService.getMetric.mockResolvedValue(limitBytes);

			const result = await EntitlementService.check("org_1", "storageGb");
			expect(result.allowed).toBe(false);
			expect(result.reason).toContain("Storage limit reached");
		});
	});

	describe("getLimit", () => {
		it("should return correct limit for plan", async () => {
			// @ts-expect-error
			db.query.organizationsTable.findFirst.mockResolvedValue({
				planKey: "growth",
			});

			const limit = await EntitlementService.getLimit("org_1", "members");
			expect(limit).toBe(10);
		});
	});
});
