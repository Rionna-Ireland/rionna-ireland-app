"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";

/**
 * Returns the active organization for `/admin` pages. The `/admin` shell is per-org:
 * org admins always have an active org (their own); platform admins acquire one via
 * `/platform` impersonation. If neither is true the layout / page will redirect away.
 */
export function useAdminOrganization() {
	const { activeOrganization } = useActiveOrganization();

	return {
		organizationId: activeOrganization?.id ?? null,
		organization: activeOrganization ?? null,
	};
}
