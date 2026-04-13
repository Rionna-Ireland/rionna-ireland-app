import { renderToStaticMarkup } from "react-dom/server";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const checkoutReturnContentSpy = vi.fn();

vi.mock("@auth/lib/server", () => ({
	getSession: vi.fn(async () => ({
		user: {
			id: "user_1",
			onboardingComplete: false,
		},
	})),
}));

vi.mock("@payments/components/CheckoutReturnContent", () => ({
	CheckoutReturnContent: (props: Record<string, unknown>) => {
		checkoutReturnContentSpy(props);

		return null;
	},
}));

vi.mock("@shared/components/AuthWrapper", () => ({
	AuthWrapper: ({ children }: { children: ReactNode }) => children,
}));

vi.mock("next-intl/server", () => ({
	getTranslations: vi.fn(async () => (key: string) => key),
}));

import CheckoutReturnPage from "./page";

afterEach(() => {
	checkoutReturnContentSpy.mockClear();
});

describe("CheckoutReturnPage", () => {
	it("does not pass organization-scoped state into checkout return", async () => {
		const element = await CheckoutReturnPage();

		renderToStaticMarkup(element);

		expect(checkoutReturnContentSpy).toHaveBeenCalledWith({});
	});
});
