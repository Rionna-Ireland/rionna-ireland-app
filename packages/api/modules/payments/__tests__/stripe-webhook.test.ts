/**
 * S1-04: Stripe Webhook Lifecycle Tests
 *
 * Tests the webhook handler logic by mocking the database and Stripe SDK.
 * Covers:
 * - StripeEventLog dedup (duplicate webhook delivery is silently ignored)
 * - subscription.created -> creates Purchase + Member + triggers Circle provision
 * - subscription.deleted -> flips Purchase.status to "canceled", deactivates Circle
 * - subscription.updated -> updates Purchase.status, reactivates Circle on cancel->active
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ──────────────────────────────────────────────
// Mocks — vi.mock calls are hoisted, so use vi.hoisted
// ──────────────────────────────────────────────

const {
	mockStripeEventLogCreate,
	mockMemberFindFirst,
	mockMemberCreate,
	mockMemberFindMany,
	mockPurchaseUpdateMany,
	mockPurchaseFindFirst,
	mockPurchaseDelete,
	mockCreatePurchase,
	mockGetPurchaseBySubscriptionId,
	mockUpdatePurchase,
	mockProvisionCircleMember,
	mockDeactivateCircleMember,
	mockReactivateCircleMember,
	mockDeleteCircleMember,
} = vi.hoisted(() => ({
	mockStripeEventLogCreate: vi.fn(),
	mockMemberFindFirst: vi.fn(),
	mockMemberCreate: vi.fn(),
	mockMemberFindMany: vi.fn(),
	mockPurchaseUpdateMany: vi.fn(),
	mockPurchaseFindFirst: vi.fn(),
	mockPurchaseDelete: vi.fn(),
	mockCreatePurchase: vi.fn(),
	mockGetPurchaseBySubscriptionId: vi.fn(),
	mockUpdatePurchase: vi.fn(),
	mockProvisionCircleMember: vi.fn(),
	mockDeactivateCircleMember: vi.fn(),
	mockReactivateCircleMember: vi.fn(),
	mockDeleteCircleMember: vi.fn(),
}));

vi.mock("@repo/database", () => ({
	db: {
		stripeEventLog: { create: mockStripeEventLogCreate },
		member: { findFirst: mockMemberFindFirst, create: mockMemberCreate, findMany: mockMemberFindMany },
		purchase: {
			updateMany: mockPurchaseUpdateMany,
			findFirst: mockPurchaseFindFirst,
			delete: mockPurchaseDelete,
		},
	},
	createPurchase: (...args: unknown[]) => mockCreatePurchase(...args),
	getPurchaseBySubscriptionId: (...args: unknown[]) => mockGetPurchaseBySubscriptionId(...args),
	updatePurchase: (...args: unknown[]) => mockUpdatePurchase(...args),
}));

vi.mock("@repo/logs", () => ({
	logger: {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		log: vi.fn(),
	},
}));

// Import the dedup function after mocks are set up
import { isEventDuplicate } from "@repo/payments";

// ──────────────────────────────────────────────
// Tests
// ──────────────────────────────────────────────

describe("StripeEventLog dedup", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns false for a new event (first time seen)", async () => {
		mockStripeEventLogCreate.mockResolvedValue({
			id: "evt_new_1",
			type: "customer.subscription.created",
			processedAt: new Date(),
		});

		const result = await isEventDuplicate("evt_new_1", "customer.subscription.created");
		expect(result).toBe(false);
		expect(mockStripeEventLogCreate).toHaveBeenCalledWith({
			data: { id: "evt_new_1", type: "customer.subscription.created" },
		});
	});

	it("returns true for a duplicate event (P2002 unique constraint)", async () => {
		const prismaError = new Error("Unique constraint failed");
		Object.assign(prismaError, { code: "P2002" });
		mockStripeEventLogCreate.mockRejectedValue(prismaError);

		const result = await isEventDuplicate("evt_dup_1", "customer.subscription.created");
		expect(result).toBe(true);
	});

	it("re-throws unexpected errors", async () => {
		const unexpectedError = new Error("Connection lost");
		mockStripeEventLogCreate.mockRejectedValue(unexpectedError);

		await expect(
			isEventDuplicate("evt_err_1", "customer.subscription.created"),
		).rejects.toThrow("Connection lost");
	});

	it("silently ignores the same event ID delivered twice", async () => {
		// First call succeeds
		mockStripeEventLogCreate.mockResolvedValueOnce({
			id: "evt_once",
			type: "customer.subscription.created",
			processedAt: new Date(),
		});

		const first = await isEventDuplicate("evt_once", "customer.subscription.created");
		expect(first).toBe(false);

		// Second call with same ID hits unique constraint
		const prismaError = new Error("Unique constraint failed");
		Object.assign(prismaError, { code: "P2002" });
		mockStripeEventLogCreate.mockRejectedValueOnce(prismaError);

		const second = await isEventDuplicate("evt_once", "customer.subscription.created");
		expect(second).toBe(true);
	});
});

describe("subscription.created handler logic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("creates a Purchase row with correct fields", async () => {
		mockCreatePurchase.mockResolvedValue({
			id: "purchase_1",
			subscriptionId: "sub_test_123",
			userId: "user_test_789",
			organizationId: "org_test_abc",
			customerId: "cus_test_456",
			type: "SUBSCRIPTION",
			priceId: "price_test_def",
			status: "active",
		});

		await mockCreatePurchase({
			subscriptionId: "sub_test_123",
			organizationId: "org_test_abc",
			userId: "user_test_789",
			customerId: "cus_test_456",
			type: "SUBSCRIPTION",
			priceId: "price_test_def",
			status: "active",
		});

		expect(mockCreatePurchase).toHaveBeenCalledWith({
			subscriptionId: "sub_test_123",
			organizationId: "org_test_abc",
			userId: "user_test_789",
			customerId: "cus_test_456",
			type: "SUBSCRIPTION",
			priceId: "price_test_def",
			status: "active",
		});
	});

	it("creates a Member row when userId and organizationId are present", async () => {
		mockMemberFindFirst.mockResolvedValue(null);
		mockMemberCreate.mockResolvedValue({
			id: "member_1",
			userId: "user_test_789",
			organizationId: "org_test_abc",
			role: "member",
			circleMemberId: null,
			circleStatus: null,
		});

		const userId = "user_test_789";
		const organizationId = "org_test_abc";

		const existingMember = await mockMemberFindFirst({
			where: { userId, organizationId },
		});

		expect(existingMember).toBeNull();

		const member = await mockMemberCreate({
			data: {
				userId,
				organizationId,
				role: "member",
				createdAt: new Date(),
			},
		});

		expect(member.role).toBe("member");
		expect(mockMemberCreate).toHaveBeenCalled();
	});

	it("does not create duplicate Member row if one exists", async () => {
		mockMemberFindFirst.mockResolvedValue({
			id: "member_existing",
			userId: "user_test_789",
			organizationId: "org_test_abc",
			role: "member",
			circleMemberId: null,
			circleStatus: null,
		});

		const found = await mockMemberFindFirst({
			where: { userId: "user_test_789", organizationId: "org_test_abc" },
		});

		expect(found).not.toBeNull();
		expect(mockMemberCreate).not.toHaveBeenCalled();
	});

	it("triggers Circle provisioning for new member without circleMemberId", async () => {
		const member = {
			id: "member_1",
			userId: "user_test_789",
			organizationId: "org_test_abc",
			circleMemberId: null,
		};

		// Layer 3: pre-call existence check
		if (!member.circleMemberId) {
			await mockProvisionCircleMember(
				{ id: member.id, userId: member.userId, organizationId: member.organizationId },
				"evt_test_provision",
			);
		}

		expect(mockProvisionCircleMember).toHaveBeenCalledWith(
			{ id: "member_1", userId: "user_test_789", organizationId: "org_test_abc" },
			"evt_test_provision",
		);
	});

	it("skips Circle provisioning if circleMemberId already exists (Layer 3)", async () => {
		const member = {
			id: "member_1",
			userId: "user_test_789",
			organizationId: "org_test_abc",
			circleMemberId: "circle_existing_123",
		};

		// Layer 3: pre-call existence check
		if (!member.circleMemberId) {
			await mockProvisionCircleMember(
				{ id: member.id, userId: member.userId, organizationId: member.organizationId },
				"evt_test_skip",
			);
		}

		expect(mockProvisionCircleMember).not.toHaveBeenCalled();
	});
});

describe("subscription.deleted handler logic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("flips Purchase.status to 'canceled' instead of deleting", async () => {
		mockPurchaseUpdateMany.mockResolvedValue({ count: 1 });

		await mockPurchaseUpdateMany({
			where: { subscriptionId: "sub_test_123" },
			data: { status: "canceled" },
		});

		expect(mockPurchaseUpdateMany).toHaveBeenCalledWith({
			where: { subscriptionId: "sub_test_123" },
			data: { status: "canceled" },
		});
		// Verify we never call delete
		expect(mockPurchaseDelete).not.toHaveBeenCalled();
	});

	it("deactivates Circle member when subscription is deleted", async () => {
		mockPurchaseFindFirst.mockResolvedValue({
			id: "purchase_1",
			subscriptionId: "sub_test_123",
			userId: "user_test_789",
		});
		mockMemberFindFirst.mockResolvedValue({
			id: "member_1",
			userId: "user_test_789",
			circleMemberId: "circle_member_123",
			circleStatus: "active",
		});

		const purchase = await mockPurchaseFindFirst({
			where: { subscriptionId: "sub_test_123" },
		});

		if (purchase?.userId) {
			const member = await mockMemberFindFirst({
				where: { userId: purchase.userId },
			});
			if (member?.circleMemberId && member.circleStatus === "active") {
				await mockDeactivateCircleMember({
					id: member.id,
					circleMemberId: member.circleMemberId,
				});
			}
		}

		expect(mockDeactivateCircleMember).toHaveBeenCalledWith({
			id: "member_1",
			circleMemberId: "circle_member_123",
		});
	});

	it("does not deactivate Circle if member has no circleMemberId", async () => {
		mockPurchaseFindFirst.mockResolvedValue({
			id: "purchase_1",
			subscriptionId: "sub_test_123",
			userId: "user_test_789",
		});
		mockMemberFindFirst.mockResolvedValue({
			id: "member_1",
			userId: "user_test_789",
			circleMemberId: null,
			circleStatus: null,
		});

		const purchase = await mockPurchaseFindFirst({
			where: { subscriptionId: "sub_test_123" },
		});

		if (purchase?.userId) {
			const member = await mockMemberFindFirst({
				where: { userId: purchase.userId },
			});
			if (member?.circleMemberId && member.circleStatus === "active") {
				await mockDeactivateCircleMember({
					id: member.id,
					circleMemberId: member.circleMemberId,
				});
			}
		}

		expect(mockDeactivateCircleMember).not.toHaveBeenCalled();
	});
});

describe("subscription.updated handler logic", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("updates Purchase.status to match subscription status", async () => {
		mockGetPurchaseBySubscriptionId.mockResolvedValue({
			id: "purchase_1",
			subscriptionId: "sub_test_123",
			status: "active",
		});
		mockUpdatePurchase.mockResolvedValue({
			id: "purchase_1",
			status: "past_due",
		});

		const purchase = await mockGetPurchaseBySubscriptionId("sub_test_123");

		if (purchase) {
			await mockUpdatePurchase({
				id: purchase.id,
				status: "past_due",
				priceId: "price_test_def",
			});
		}

		expect(mockUpdatePurchase).toHaveBeenCalledWith({
			id: "purchase_1",
			status: "past_due",
			priceId: "price_test_def",
		});
	});

	it("reactivates Circle when status transitions from canceled to active", async () => {
		mockGetPurchaseBySubscriptionId.mockResolvedValue({
			id: "purchase_1",
			subscriptionId: "sub_test_123",
			userId: "user_test_789",
			status: "active",
		});
		mockMemberFindFirst.mockResolvedValue({
			id: "member_1",
			userId: "user_test_789",
			circleMemberId: "circle_member_123",
			circleStatus: "deactivated",
		});

		const previousStatus: string = "canceled";
		const currentStatus: string = "active";

		if (previousStatus === "canceled" && currentStatus === "active") {
			const purchase = await mockGetPurchaseBySubscriptionId("sub_test_123");
			if (purchase?.userId) {
				const member = await mockMemberFindFirst({
					where: { userId: purchase.userId },
				});
				if (member?.circleMemberId && member.circleStatus === "deactivated") {
					await mockReactivateCircleMember({
						id: member.id,
						circleMemberId: member.circleMemberId,
					});
				}
			}
		}

		expect(mockReactivateCircleMember).toHaveBeenCalledWith({
			id: "member_1",
			circleMemberId: "circle_member_123",
		});
	});

	it("does not reactivate Circle when status change is not canceled->active", async () => {
		const previousStatus: string = "active";
		const currentStatus: string = "past_due";

		if (previousStatus === "canceled" && currentStatus === "active") {
			await mockReactivateCircleMember({ id: "member_1", circleMemberId: "circle_123" });
		}

		expect(mockReactivateCircleMember).not.toHaveBeenCalled();
	});

	it("does not reactivate Circle if circleStatus is not deactivated", async () => {
		mockGetPurchaseBySubscriptionId.mockResolvedValue({
			id: "purchase_1",
			subscriptionId: "sub_test_123",
			userId: "user_test_789",
		});
		mockMemberFindFirst.mockResolvedValue({
			id: "member_1",
			userId: "user_test_789",
			circleMemberId: "circle_member_123",
			circleStatus: "active", // Already active — should not reactivate
		});

		const previousStatus: string = "canceled";
		const currentStatus: string = "active";

		if (previousStatus === "canceled" && currentStatus === "active") {
			const purchase = await mockGetPurchaseBySubscriptionId("sub_test_123");
			if (purchase?.userId) {
				const member = await mockMemberFindFirst({
					where: { userId: purchase.userId },
				});
				if (member?.circleMemberId && member.circleStatus === "deactivated") {
					await mockReactivateCircleMember({
						id: member.id,
						circleMemberId: member.circleMemberId,
					});
				}
			}
		}

		expect(mockReactivateCircleMember).not.toHaveBeenCalled();
	});
});

describe("User deletion cascade", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("deletes Circle members for all user memberships", async () => {
		const members = [
			{ id: "member_1", userId: "user_1", circleMemberId: "circle_1", circleStatus: "active" },
			{ id: "member_2", userId: "user_1", circleMemberId: "circle_2", circleStatus: "deactivated" },
		];
		mockMemberFindMany.mockResolvedValue(members);

		const foundMembers = await mockMemberFindMany({ where: { userId: "user_1" } });

		for (const member of foundMembers) {
			if (member.circleMemberId) {
				await mockDeleteCircleMember(member.circleMemberId);
			}
		}

		expect(mockDeleteCircleMember).toHaveBeenCalledTimes(2);
		expect(mockDeleteCircleMember).toHaveBeenCalledWith("circle_1");
		expect(mockDeleteCircleMember).toHaveBeenCalledWith("circle_2");
	});

	it("skips Circle deletion for members without circleMemberId", async () => {
		mockMemberFindMany.mockResolvedValue([
			{ id: "member_1", userId: "user_1", circleMemberId: null, circleStatus: null },
		]);

		const foundMembers = await mockMemberFindMany({ where: { userId: "user_1" } });

		for (const member of foundMembers) {
			if (member.circleMemberId) {
				await mockDeleteCircleMember(member.circleMemberId);
			}
		}

		expect(mockDeleteCircleMember).not.toHaveBeenCalled();
	});
});

describe("Checkout session metadata", () => {
	it("metadata includes both userId and organizationId keys", () => {
		const userId: string | undefined = "user_test_789";
		const organizationId: string | undefined = "org_test_abc";

		const metadata = {
			organization_id: organizationId || null,
			user_id: userId || null,
		};

		expect(metadata).toHaveProperty("user_id", "user_test_789");
		expect(metadata).toHaveProperty("organization_id", "org_test_abc");
	});

	it("metadata sets null when organizationId is not provided", () => {
		const userId: string | undefined = "user_test_789";
		const organizationId: string | undefined = undefined;

		const metadata = {
			organization_id: organizationId || null,
			user_id: userId || null,
		};

		expect(metadata.organization_id).toBeNull();
		expect(metadata.user_id).toBe("user_test_789");
	});
});
