import React from "react";
import { getSession } from "@auth/lib/server";
import { listPurchases } from "@payments/lib/server";
import { OnboardingForm } from "@onboarding/components/OnboardingForm";
import { config } from "@repo/auth/config";
import { createPurchasesHelper } from "@repo/payments/lib/helper";
import { AuthWrapper } from "@shared/components/AuthWrapper";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function generateMetadata() {
	const t = await getTranslations("onboarding");

	return {
		title: t("title"),
	};
}

export default async function OnboardingPage() {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	if (!config.users.enableOnboarding || session.user.onboardingComplete) {
		redirect("/");
	}

	const purchases = await listPurchases();
	const { activePlan } = createPurchasesHelper(purchases);

	if (!activePlan) {
		redirect("/subscribe");
	}

	return (
		<AuthWrapper>
			<OnboardingForm />
		</AuthWrapper>
	);
}
