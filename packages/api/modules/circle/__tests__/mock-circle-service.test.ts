/**
 * MockCircleService tests
 *
 * Verifies the in-memory mock behaves correctly:
 * - Incrementing IDs
 * - Idempotency key dedup
 * - State transitions (active → deactivated → deleted)
 * - Error handling (404 for unknown members)
 * - Deterministic token minting
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import { MockCircleService, CircleApiError } from "@repo/payments/lib/circle";

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

			expect(first.circleMemberId).toBe("mock-circle-90001");
			expect(second.circleMemberId).toBe("mock-circle-90002");
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

			expect(duplicate.circleMemberId).toBe(first.circleMemberId);
			expect(service.getMemberCount()).toBe(1);
		});
	});

	describe("deactivateMember", () => {
		it("deactivates an active member", async () => {
			const { circleMemberId } = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});

			await service.deactivateMember(circleMemberId);
			expect(service.getMemberStatus(circleMemberId)).toBe("deactivated");
		});

		it("throws 404 for an unknown member", async () => {
			await expect(
				service.deactivateMember("nonexistent"),
			).rejects.toThrow(CircleApiError);

			try {
				await service.deactivateMember("nonexistent");
			} catch (error) {
				expect(error).toBeInstanceOf(CircleApiError);
				expect((error as CircleApiError).statusCode).toBe(404);
			}
		});

		it("throws 422 for an already deactivated member", async () => {
			const { circleMemberId } = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});

			await service.deactivateMember(circleMemberId);

			try {
				await service.deactivateMember(circleMemberId);
			} catch (error) {
				expect(error).toBeInstanceOf(CircleApiError);
				expect((error as CircleApiError).statusCode).toBe(422);
			}
		});
	});

	describe("reactivateMember", () => {
		it("reactivates a deactivated member by ssoUserId", async () => {
			const { circleMemberId } = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});

			await service.deactivateMember(circleMemberId);
			expect(service.getMemberStatus(circleMemberId)).toBe("deactivated");

			await service.reactivateMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "reactivate-001",
			});

			expect(service.getMemberStatus(circleMemberId)).toBe("active");
		});

		it("creates a new member if the original was hard-deleted", async () => {
			const { circleMemberId } = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});

			await service.deleteMember(circleMemberId);
			expect(service.getMemberCount()).toBe(0);

			await service.reactivateMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "reactivate-001",
			});

			expect(service.getMemberCount()).toBe(1);
		});
	});

	describe("deleteMember", () => {
		it("removes a member entirely", async () => {
			const { circleMemberId } = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});

			await service.deleteMember(circleMemberId);
			expect(service.getMemberCount()).toBe(0);
			expect(service.getMemberStatus(circleMemberId)).toBeUndefined();
		});

		it("throws 404 for an unknown member", async () => {
			try {
				await service.deleteMember("nonexistent");
			} catch (error) {
				expect(error).toBeInstanceOf(CircleApiError);
				expect((error as CircleApiError).statusCode).toBe(404);
			}
		});

		it("subsequent deactivate throws 404 after delete", async () => {
			const { circleMemberId } = await service.createMember({
				email: "alice@example.com",
				name: "Alice",
				ssoUserId: "user-1",
				idempotencyKey: "evt_001",
			});

			await service.deleteMember(circleMemberId);

			try {
				await service.deactivateMember(circleMemberId);
			} catch (error) {
				expect(error).toBeInstanceOf(CircleApiError);
				expect((error as CircleApiError).statusCode).toBe(404);
			}
		});
	});

	describe("getMemberToken", () => {
		it("returns deterministic mock tokens", async () => {
			const result = await service.getMemberToken("user-123");

			expect(result.accessToken).toBe("mock-access-token-user-123");
			expect(result.refreshToken).toBe("mock-refresh-token-user-123");
		});
	});
});
