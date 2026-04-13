"use client";

import { Button } from "@repo/ui/components/button";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useMutation } from "@tanstack/react-query";
import { ArrowRightIcon } from "lucide-react";
import { useState } from "react";

export function SubscribeButton({ organizationId }: { organizationId: string }) {
	const [loading, setLoading] = useState(false);

	const createCheckoutLinkMutation = useMutation(
		orpc.payments.createCheckoutLink.mutationOptions(),
	);

	const handleSubscribe = async () => {
		setLoading(true);

		try {
			const { checkoutLink } = await createCheckoutLinkMutation.mutateAsync({
				planId: "membership",
				type: "subscription",
				interval: "month",
				organizationId,
				redirectUrl: `${window.location.origin}/checkout-return?organizationId=${organizationId}`,
			});

			window.location.href = checkoutLink;
		} catch {
			setLoading(false);
		}
	};

	return (
		<Button
			className="w-full"
			variant="primary"
			onClick={handleSubscribe}
			loading={loading}
		>
			Subscribe
			<ArrowRightIcon className="ml-2 size-4" />
		</Button>
	);
}
