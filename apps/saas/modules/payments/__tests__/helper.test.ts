import { describe, expect, it } from "vitest";

import { createPurchasesHelper, type ResolvedPurchase } from "@repo/payments/lib/helper";

function makeSubscriptionPurchase(status: ResolvedPurchase["status"]): ResolvedPurchase {
	return {
		id: "purchase_1",
		organizationId: null,
		userId: "user_1",
		type: "SUBSCRIPTION",
		customerId: "customer_1",
		subscriptionId: "sub_1",
		priceId: "price_1",
		status,
		planId: "membership",
		planPrice: {
			type: "subscription",
			interval: "month",
			amount: 29,
			currency: "EUR",
		},
	};
}

describe("createPurchasesHelper", () => {
	it.each(["active", "trialing", "past_due"] as const)(
		"accepts %s subscription purchases",
		(status) => {
			const { activePlan } = createPurchasesHelper([makeSubscriptionPurchase(status)]);

			expect(activePlan).toMatchObject({
				id: "membership",
				status,
				purchaseId: "purchase_1",
			});
		},
	);

	it.each(["canceled", "expired", "unpaid", "paused"] as const)(
		"ignores %s subscription purchases",
		(status) => {
			const { activePlan } = createPurchasesHelper([makeSubscriptionPurchase(status)]);

			expect(activePlan).toBeNull();
		},
	);
});
