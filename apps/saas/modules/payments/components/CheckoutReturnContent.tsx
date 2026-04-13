"use client";

import { createPurchasesHelper } from "@repo/payments/lib/helper";
import { Spinner } from "@repo/ui/components/spinner";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const MAX_WAIT_MS = 20_000;
const POLL_INTERVAL_MS = 2_000;

export function CheckoutReturnContent() {
	const t = useTranslations("checkoutReturn");
	const router = useRouter();
	const [polling, setPolling] = useState(true);
	const { data } = useQuery({
		...orpc.payments.listPurchases.queryOptions({
			input: {},
		}),
		refetchInterval: polling ? POLL_INTERVAL_MS : false,
	});

	const purchases = data ?? [];
	const { activePlan } = createPurchasesHelper(purchases);

	useEffect(() => {
		if (activePlan) {
			setPolling(false);
			router.replace("/onboarding");
		}
	}, [activePlan, router]);

	useEffect(() => {
		const timer = setTimeout(() => {
			setPolling(false);
			router.replace("/subscribe");
		}, MAX_WAIT_MS);

		return () => clearTimeout(timer);
	}, [router]);

	return (
		<div className="gap-4 py-8 flex flex-col items-center justify-center">
			<Spinner className="size-8" />
			<p className="text-sm text-center text-muted-foreground">{t("loading")}</p>
		</div>
	);
}
