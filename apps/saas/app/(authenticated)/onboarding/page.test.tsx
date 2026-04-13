import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const redirectSpy = vi.hoisted(() =>
	vi.fn((url: string) => {
		throw new Error(`REDIRECT:${url}`);
	}),
);

vi.mock("@auth/lib/server", () => ({
	getSession: vi.fn(async () => ({
		user: {
			id: "user_1",
			onboardingComplete: false,
		},
	})),
}));

vi.mock("@payments/lib/server", () => ({
	listPurchases: vi.fn(async () => [
		{
			id: "purchase_1",
			organizationId: null,
			userId: "user_1",
			type: "SUBSCRIPTION",
			customerId: "customer_1",
			subscriptionId: "sub_1",
			priceId: "price_1",
			status: "canceled",
			planId: "membership",
			planPrice: {
				type: "subscription",
				interval: "month",
				amount: 29,
				currency: "EUR",
			},
		},
	]),
}));

vi.mock("@repo/auth/config", () => ({
	config: {
		users: {
			enableOnboarding: true,
		},
	},
}));

vi.mock("@shared/components/AuthWrapper", () => ({
	AuthWrapper: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("next/navigation", () => ({
	redirect: redirectSpy,
}));

vi.mock("next-intl/server", () => ({
	getTranslations: vi.fn(async () => (key: string) => key),
}));

vi.mock("@onboarding/components/OnboardingForm", () => ({
	OnboardingForm: () => null,
}));

import OnboardingPage from "./page";

describe("OnboardingPage", () => {
	it("redirects unpaid users away from onboarding", async () => {
		await expect(OnboardingPage()).rejects.toThrow("REDIRECT:/subscribe");
	});
});
