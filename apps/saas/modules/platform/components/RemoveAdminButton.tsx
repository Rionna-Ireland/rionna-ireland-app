"use client";

import { Button } from "@repo/ui/components/button";
import { toastError, toastSuccess } from "@repo/ui/components/toast";
import { orpcClient } from "@shared/lib/orpc-client";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface RemoveAdminButtonProps {
	organizationId: string;
	memberId: string;
	memberLabel: string;
}

export function RemoveAdminButton({
	organizationId,
	memberId,
	memberLabel,
}: RemoveAdminButtonProps) {
	const [pending, setPending] = useState(false);
	const router = useRouter();

	const onClick = async () => {
		const ok = window.confirm(
			`Remove ${memberLabel} as an admin of this organization? Their user account stays intact.`,
		);
		if (!ok) {
			return;
		}
		setPending(true);
		try {
			await orpcClient.platform.removeAdmin({ organizationId, memberId });
			toastSuccess("Admin removed");
			router.refresh();
		} catch (error) {
			toastError(error instanceof Error ? error.message : "Failed to remove admin");
		} finally {
			setPending(false);
		}
	};

	return (
		<Button
			size="sm"
			variant="outline"
			loading={pending}
			onClick={onClick}
			className="border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-100"
		>
			Remove
		</Button>
	);
}
