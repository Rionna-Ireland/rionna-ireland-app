/**
 * S1-06: Circle/Stripe Reconciliation Tests
 *
 * Verifies the reconcileCircleMembers function:
 * - Unprovisioned members (active Purchase, no circleMemberId) get provisioned
 * - Stale active members (canceled Purchase, circleStatus active) get deactivated
 * - Per-member resilience — one failure doesn't block others
 * - Errors logged with structured context (userId, orgId)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ──────────────────────────────────────────────
// Mocks — vi.mock calls are hoisted
// ──────────────────────────────────────────────

const {
	mockOrgFindUnique,
	mockMemberFindManyUnprovisioned,
	mockMemberFindManyStale,
	mockMemberUpdate,
	mockCreateMember,
	mockDeactivateMember,
	mockLoggerInfo,
	mockLoggerWarn,
	mockLoggerError,
} = vi.hoisted(() => ({
	mockOrgFindUnique: vi.fn(),
	mockMemberFindManyUnprovisioned: vi.fn(),
	mockMemberFindManyStale: vi.fn(),
	mockMemberUpdate: vi.fn(),
	mockCreateMember: vi.fn(),
	mockDeactivateMember: vi.fn(),
	mockLoggerInfo: vi.fn(),
	mockLoggerWarn: vi.fn(),
	mockLoggerError: vi.fn(),
}));

vi.mock("@repo/database", () => ({
	db: {
		organization: {
			findUnique: mockOrgFindUnique,
		},
		member: {
			findMany: vi.fn((args) => {
				// Route to the correct mock based on the query shape
				if (args.where?.circleMemberId === null) {
					return mockMemberFindManyUnprovisioned(args);
				}
				return mockMemberFindManyStale(args);
			}),
			update: mockMemberUpdate,
		},
	},
}));

vi.mock("@repo/logs", () => ({
	logger: {
		info: mockLoggerInfo,
		warn: mockLoggerWarn,
		error: mockLoggerError,
		log: vi.fn(),
	},
}));

vi.mock("@repo/payments/lib/circle", () => ({
	createCircleService: vi.fn(() => ({
		createMember: mockCreateMember,
		deactivateMember: mockDeactivateMember,
		reactivateMember: vi.fn(),
		deleteMember: vi.fn(),
		getMemberToken: vi.fn(),
	})),
}));

// ──────────────────────────────────────────────
// Import the function under test
// ──────────────────────────────────────────────

import { reconcileCircleMembers } from "../reconciliation";

// ──────────────────────────────────────────────
// Fixtures
// ──────────────────────────────────────────────

const ORG_ID = "org-pink-connections";
const ORG = { id: ORG_ID, slug: "pink-connections", name: "Pink Connections", metadata: null };

function makeUnprovisionedMember(id: string, userId: string) {
	return {
		id,
		userId,
		organizationId: ORG_ID,
		circleMemberId: null,
		circleStatus: null,
		user: { id: userId, email: `${userId}@test.com`, name: `User ${userId}` },
	};
}

function makeStaleActiveMember(id: string, userId: string, circleMemberId: string) {
	return {
		id,
		userId,
		organizationId: ORG_ID,
		circleMemberId,
		circleStatus: "active",
	};
}

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("reconcileCircleMembers", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockOrgFindUnique.mockResolvedValue(ORG);
		mockMemberFindManyUnprovisioned.mockResolvedValue([]);
		mockMemberFindManyStale.mockResolvedValue([]);
		mockMemberUpdate.mockResolvedValue({});
	});

	it("returns zeros when no members need reconciliation", async () => {
		const result = await reconcileCircleMembers(ORG_ID);

		expect(result).toEqual({ provisioned: 0, deactivated: 0, errors: 0 });
	});

	it("returns zeros when organization not found", async () => {
		mockOrgFindUnique.mockResolvedValue(null);

		const result = await reconcileCircleMembers("non-existent");

		expect(result).toEqual({ provisioned: 0, deactivated: 0, errors: 0 });
		expect(mockLoggerWarn).toHaveBeenCalledWith(
			"[Reconciliation] Organization not found or missing slug",
			expect.objectContaining({ organizationId: "non-existent" }),
		);
	});

	describe("provisioning unprovisioned members", () => {
		it("provisions members with active Purchase but no circleMemberId", async () => {
			const member = makeUnprovisionedMember("m1", "u1");
			mockMemberFindManyUnprovisioned.mockResolvedValue([member]);
			mockCreateMember.mockResolvedValue({ circleMemberId: "circle-123" });

			const result = await reconcileCircleMembers(ORG_ID);

			expect(result.provisioned).toBe(1);
			expect(mockCreateMember).toHaveBeenCalledWith({
				email: "u1@test.com",
				name: "User u1",
				ssoUserId: "u1",
				idempotencyKey: "reconcile-provision-m1",
			});
			expect(mockMemberUpdate).toHaveBeenCalledWith({
				where: { id: "m1" },
				data: expect.objectContaining({
					circleMemberId: "circle-123",
					circleStatus: "active",
				}),
			});
			expect(mockLoggerInfo).toHaveBeenCalledWith(
				"[Reconciliation] Provisioned Circle member",
				expect.objectContaining({ userId: "u1", orgId: ORG_ID }),
			);
		});

		it("provisions multiple members", async () => {
			const members = [
				makeUnprovisionedMember("m1", "u1"),
				makeUnprovisionedMember("m2", "u2"),
				makeUnprovisionedMember("m3", "u3"),
			];
			mockMemberFindManyUnprovisioned.mockResolvedValue(members);
			mockCreateMember
				.mockResolvedValueOnce({ circleMemberId: "c-1" })
				.mockResolvedValueOnce({ circleMemberId: "c-2" })
				.mockResolvedValueOnce({ circleMemberId: "c-3" });

			const result = await reconcileCircleMembers(ORG_ID);

			expect(result.provisioned).toBe(3);
			expect(result.errors).toBe(0);
		});

		it("uses email as name when user.name is null", async () => {
			const member = makeUnprovisionedMember("m1", "u1");
			member.user.name = null as unknown as string;
			mockMemberFindManyUnprovisioned.mockResolvedValue([member]);
			mockCreateMember.mockResolvedValue({ circleMemberId: "c-1" });

			await reconcileCircleMembers(ORG_ID);

			expect(mockCreateMember).toHaveBeenCalledWith(
				expect.objectContaining({ name: "u1@test.com" }),
			);
		});
	});

	describe("deactivating stale active members", () => {
		it("deactivates members with canceled Purchase but circleStatus active", async () => {
			const member = makeStaleActiveMember("m1", "u1", "circle-456");
			mockMemberFindManyStale.mockResolvedValue([member]);

			const result = await reconcileCircleMembers(ORG_ID);

			expect(result.deactivated).toBe(1);
			expect(mockDeactivateMember).toHaveBeenCalledWith("circle-456");
			expect(mockMemberUpdate).toHaveBeenCalledWith({
				where: { id: "m1" },
				data: { circleStatus: "deactivated" },
			});
			expect(mockLoggerInfo).toHaveBeenCalledWith(
				"[Reconciliation] Deactivated Circle member",
				expect.objectContaining({ userId: "u1", orgId: ORG_ID }),
			);
		});

		it("deactivates multiple stale members", async () => {
			const members = [
				makeStaleActiveMember("m1", "u1", "c-1"),
				makeStaleActiveMember("m2", "u2", "c-2"),
			];
			mockMemberFindManyStale.mockResolvedValue(members);

			const result = await reconcileCircleMembers(ORG_ID);

			expect(result.deactivated).toBe(2);
			expect(result.errors).toBe(0);
		});
	});

	describe("per-member resilience", () => {
		it("continues provisioning remaining members when one fails", async () => {
			const members = [
				makeUnprovisionedMember("m1", "u1"),
				makeUnprovisionedMember("m2", "u2"),
				makeUnprovisionedMember("m3", "u3"),
			];
			mockMemberFindManyUnprovisioned.mockResolvedValue(members);
			mockCreateMember
				.mockResolvedValueOnce({ circleMemberId: "c-1" })
				.mockRejectedValueOnce(new Error("Circle API timeout"))
				.mockResolvedValueOnce({ circleMemberId: "c-3" });

			const result = await reconcileCircleMembers(ORG_ID);

			expect(result.provisioned).toBe(2);
			expect(result.errors).toBe(1);
			expect(mockCreateMember).toHaveBeenCalledTimes(3);
		});

		it("continues deactivating remaining members when one fails", async () => {
			const members = [
				makeStaleActiveMember("m1", "u1", "c-1"),
				makeStaleActiveMember("m2", "u2", "c-2"),
			];
			mockMemberFindManyStale.mockResolvedValue(members);
			mockDeactivateMember
				.mockRejectedValueOnce(new Error("Network error"))
				.mockResolvedValueOnce(undefined);

			const result = await reconcileCircleMembers(ORG_ID);

			expect(result.deactivated).toBe(1);
			expect(result.errors).toBe(1);
			expect(mockDeactivateMember).toHaveBeenCalledTimes(2);
		});

		it("logs errors with structured context", async () => {
			const member = makeUnprovisionedMember("m1", "u1");
			mockMemberFindManyUnprovisioned.mockResolvedValue([member]);
			mockCreateMember.mockRejectedValue(new Error("Circle 503"));

			await reconcileCircleMembers(ORG_ID);

			expect(mockLoggerError).toHaveBeenCalledWith(
				"[Reconciliation] Failed to provision member",
				expect.objectContaining({
					userId: "u1",
					orgId: ORG_ID,
					error: "Circle 503",
				}),
			);
		});
	});

	describe("combined scenarios", () => {
		it("handles both provisioning and deactivation in one run", async () => {
			mockMemberFindManyUnprovisioned.mockResolvedValue([
				makeUnprovisionedMember("m1", "u1"),
			]);
			mockMemberFindManyStale.mockResolvedValue([
				makeStaleActiveMember("m2", "u2", "c-2"),
			]);
			mockCreateMember.mockResolvedValue({ circleMemberId: "c-1" });

			const result = await reconcileCircleMembers(ORG_ID);

			expect(result).toEqual({ provisioned: 1, deactivated: 1, errors: 0 });
		});
	});
});
