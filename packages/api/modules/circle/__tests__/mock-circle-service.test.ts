/**
 * MockCircleService tests
 *
 * Verifies the in-memory mock behaves correctly:
 * - Incrementing IDs
 * - Idempotency key dedup
 * - State transitions (active → deactivated → deleted)
 * - Error outcomes (not_found for unknown members, invalid_input for
 *   already-deactivated members)
 * - Deterministic token minting
 *
 * Updated in T7 to consume the CircleCallOutcome<T> shape.
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

describe("MockCircleService", () => {
	let service: MockCircleService;

	beforeEach(() => {
		service = new MockCircleService();
	});

	describe("createMember", () => {
		it("returns an incrementing circleMemberId", async () => {
			const first = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});
			const second = await service.createMember({
				email: "bob@example.com",
				name: "Bob",
				ssoUserId: "user-2",
				idempotencyKey: "evt_002",
			});

			if (!first.ok) throw new Error("expected ok");
			if (!second.ok) throw new Error("expected ok");
			expect(first.data.circleMemberId).toBe("mock-circle-90001");
			expect(second.data.circleMemberId).toBe("mock-circle-90002");
			expect(service.getMemberCount()).toBe(2);
		});

		it("returns the same ID for a duplicate idempotency key", async () => {
			const first = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});
			const duplicate = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});

			if (!first.ok || !duplicate.ok) throw new Error("expected ok");
			expect(duplicate.data.circleMemberId).toBe(first.data.circleMemberId);
			expect(service.getMemberCount()).toBe(1);
		});
	});

	describe("deactivateMember", () => {
		it("deactivates an active member", async () => {
			const created = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});
			if (!created.ok) throw new Error("expected ok");
			const { circleMemberId } = created.data;

			const outcome = await service.deactivateMember(circleMemberId);
			expect(outcome.ok).toBe(true);
			expect(service.getMemberStatus(circleMemberId)).toBe("deactivated");
		});

		it("returns not_found for an unknown member", async () => {
			const outcome = await service.deactivateMember("nonexistent");
			expect(outcome).toMatchObject({
				ok: false,
				reason: "not_found",
				retriable: false,
			});
		});

		it("returns invalid_input for an already-deactivated member", async () => {
			const created = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});
			if (!created.ok) throw new Error("expected ok");
			const { circleMemberId } = created.data;

			await service.deactivateMember(circleMemberId);
			const outcome = await service.deactivateMember(circleMemberId);

			expect(outcome).toMatchObject({
				ok: false,
				reason: "invalid_input",
				retriable: false,
			});
		});
	});

	describe("reactivateMember", () => {
		it("reactivates a deactivated member by ssoUserId", async () => {
			const created = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});
			if (!created.ok) throw new Error("expected ok");
			const { circleMemberId } = created.data;

			await service.deactivateMember(circleMemberId);
			expect(service.getMemberStatus(circleMemberId)).toBe("deactivated");

			const outcome = await service.reactivateMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "reactivate-001",
			});

			expect(outcome.ok).toBe(true);
			expect(service.getMemberStatus(circleMemberId)).toBe("active");
		});

		it("creates a new member if the original was hard-deleted", async () => {
			const created = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});
			if (!created.ok) throw new Error("expected ok");
			const { circleMemberId } = created.data;

			await service.deleteMember(circleMemberId);
			expect(service.getMemberCount()).toBe(0);

			const outcome = await service.reactivateMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "reactivate-001",
			});

			expect(outcome.ok).toBe(true);
			expect(service.getMemberCount()).toBe(1);
		});
	});

	describe("deleteMember", () => {
		it("removes a member entirely", async () => {
			const created = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});
			if (!created.ok) throw new Error("expected ok");
			const { circleMemberId } = created.data;

			const outcome = await service.deleteMember(circleMemberId);
			expect(outcome.ok).toBe(true);
			expect(service.getMemberCount()).toBe(0);
			expect(service.getMemberStatus(circleMemberId)).toBeUndefined();
		});

		it("returns not_found for an unknown member", async () => {
			const outcome = await service.deleteMember("nonexistent");
			expect(outcome).toMatchObject({
				ok: false,
				reason: "not_found",
				retriable: false,
			});
		});

		it("subsequent deactivate returns not_found after delete", async () => {
			const created = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});
			if (!created.ok) throw new Error("expected ok");
			const { circleMemberId } = created.data;

			await service.deleteMember(circleMemberId);
			const outcome = await service.deactivateMember(circleMemberId);

			expect(outcome).toMatchObject({
				ok: false,
				reason: "not_found",
				retriable: false,
			});
		});
	});

	describe("getMemberToken", () => {
		it("returns deterministic mock tokens", async () => {
			const outcome = await service.getMemberToken("user-123");

			if (!outcome.ok) throw new Error("expected ok");
			expect(outcome.data.accessToken).toBe("mock-access-token-user-123");
			expect(outcome.data.refreshToken).toBe("mock-refresh-token-user-123");
		});
	});
});
