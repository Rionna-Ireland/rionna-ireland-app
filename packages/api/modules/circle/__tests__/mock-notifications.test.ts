/**
 * MockCircleService.getMemberNotifications tests
 *
 * Verifies the in-memory mock notification store supports:
 * - Seeded scripted pages returned oldest→newest
 * - Exclusive cursor pagination (cursor id itself excluded)
 * - Unknown members return empty page + null cursor
 * - Caught-up callers get empty page + null cursor
 *   (matches T2 JSDoc: `nextCursor` is "null if the page is empty")
 * - `limit` honored when fewer items than seeded
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockCircleService } from "@repo/payments/lib/circle";

vi.mock("@repo/logs", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		log: vi.fn(),
	},
}));

describe("MockCircleService.getMemberNotifications", () => {
	let svc: MockCircleService;

	beforeEach(() => {
		svc = new MockCircleService();
	});

	it("returns scripted pages oldest→newest", async () => {
		svc.seedNotifications("123", [
			{ id: "1001", type: "mention" },
			{ id: "1002", type: "reaction" },
		]);
		const outcome = await svc.getMemberNotifications("123", {
			sinceNotificationId: null,
		});
		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.data.items.map((i) => i.id)).toEqual(["1001", "1002"]);
		expect(outcome.data.nextCursor).toBe("1002");
	});

	it("excludes the cursor id itself (exclusive pagination)", async () => {
		svc.seedNotifications("123", [
			{ id: "1001" },
			{ id: "1002" },
			{ id: "1003" },
		]);
		const outcome = await svc.getMemberNotifications("123", {
			sinceNotificationId: "1001",
		});
		if (!outcome.ok) throw new Error("expected ok");
		expect(outcome.data.items.map((i) => i.id)).toEqual(["1002", "1003"]);
		expect(outcome.data.nextCursor).toBe("1003");
	});

	it("returns empty + null cursor for unknown member", async () => {
		const outcome = await svc.getMemberNotifications("999", {
			sinceNotificationId: null,
		});
		if (!outcome.ok) throw new Error("expected ok");
		expect(outcome.data.items).toEqual([]);
		expect(outcome.data.nextCursor).toBeNull();
	});

	it("returns empty + null cursor when caller is caught up", async () => {
		svc.seedNotifications("123", [{ id: "1001" }, { id: "1002" }]);
		const outcome = await svc.getMemberNotifications("123", {
			sinceNotificationId: "1002",
		});
		if (!outcome.ok) throw new Error("expected ok");
		expect(outcome.data.items).toEqual([]);
		// T2 JSDoc: nextCursor is "null if the page is empty"
		expect(outcome.data.nextCursor).toBeNull();
	});

	it("honors limit", async () => {
		svc.seedNotifications("123", [
			{ id: "1001" },
			{ id: "1002" },
			{ id: "1003" },
			{ id: "1004" },
		]);
		const outcome = await svc.getMemberNotifications("123", {
			sinceNotificationId: null,
			limit: 2,
		});
		if (!outcome.ok) throw new Error("expected ok");
		expect(outcome.data.items.map((i) => i.id)).toEqual(["1001", "1002"]);
		expect(outcome.data.nextCursor).toBe("1002");
	});
});
