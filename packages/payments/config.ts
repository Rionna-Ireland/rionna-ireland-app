import type { PaymentsConfig } from "./types";

export const config: PaymentsConfig = {
	billingAttachedTo: "user",
	requireActiveSubscription: true,
	plans: {
		membership: {
			recommended: true,
			prices: [
				{
					type: "subscription",
					priceId: process.env.PRICE_ID_MEMBERSHIP_MONTHLY as string,
					interval: "month",
					amount: 29,
					currency: "EUR",
				},
			],
		},
	},
};
