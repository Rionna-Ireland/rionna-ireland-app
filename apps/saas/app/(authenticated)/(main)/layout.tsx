import { getOrganizationList, getSession } from "@auth/lib/server";
import { listPurchases } from "@repo/api/modules/payments/procedures/list-purchases";
import { config as authConfig } from "@repo/auth/config";
import { config as paymentsConfig } from "@repo/payments/config";
import { createPurchasesHelper } from "@repo/payments/lib/helper";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import type { PropsWithChildren } from "react";

export default async function MainLayout({ children }: PropsWithChildren) {
	const session = await getSession();

	if (!session) {
		redirect("/login");
	}

	// Subscription check BEFORE onboarding (per D9: subscribe → then onboard)
	// Billing is user-scoped (billingAttachedTo: "user"), so query by userId not organizationId
	if (paymentsConfig.requireActiveSubscription) {
		const purchases = await listPurchases.callable({
			context: { headers: await headers() },
		})({});

		const { activePlan } = createPurchasesHelper(purchases);

		if (!activePlan) {
			redirect("/subscribe");
		}
	}

	if (authConfig.users.enableOnboarding && !session.user.onboardingComplete) {
		redirect("/onboarding");
	}

	const organizations = await getOrganizationList();

	if (authConfig.organizations.enable && authConfig.organizations.requireOrganization) {
		const organization =
			organizations.find((org) => org.id === session?.session.activeOrganizationId) ||
			organizations[0];

		if (!organization) {
			redirect("/new-organization");
		}
	}

	return children;
}
