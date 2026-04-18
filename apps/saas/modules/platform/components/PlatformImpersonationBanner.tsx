"use client";

import { useSession } from "@auth/hooks/use-session";
import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import Link from "next/link";

export function PlatformImpersonationBanner() {
	const { user } = useSession();
	const { activeOrganization } = useActiveOrganization();

	if (user?.role !== "platformAdmin" || !activeOrganization) {
		return null;
	}

	return (
		<div className="bg-amber-500 text-zinc-950 px-4 py-2 text-sm flex items-center justify-between gap-4 border-b border-amber-600">
			<div className="font-medium">
				Platform admin (viewing as: {activeOrganization.name})
			</div>
			<Link
				href="/platform"
				className="text-xs font-semibold underline hover:no-underline"
			>
				← Back to /platform
			</Link>
		</div>
	);
}
