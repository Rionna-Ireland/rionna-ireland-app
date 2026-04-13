"use client";

import { useActiveOrganization } from "@organizations/hooks/use-active-organization";
import { orpc } from "@shared/lib/orpc-query-utils";
import { useQuery } from "@tanstack/react-query";

/**
 * Returns the organization for admin pages. Uses the active organization if set,
 * otherwise falls back to fetching the first organization (single-tenant fallback).
 */
export function useAdminOrganization() {
	const { activeOrganization } = useActiveOrganization();

	const { data: orgList } = useQuery({
		...orpc.admin.organizations.list.queryOptions({
			input: { limit: 1, offset: 0 },
		}),
		enabled: !activeOrganization,
	});

	const organization = activeOrganization ?? orgList?.organizations?.[0] ?? null;

	return {
		organizationId: organization?.id ?? null,
		organization,
	};
}
