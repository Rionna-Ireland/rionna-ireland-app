import { db } from "@repo/database";
import { z } from "zod";

import { platformAdminProcedure } from "../../../orpc/procedures";

const ACTIVE_PURCHASE_STATUSES = ["active", "trialing", "past_due"];

interface OrgMetadata {
	racing?: Record<string, unknown>;
	circle?: { communityId?: string | null; communityDomain?: string | null };
	billing?: Record<string, unknown>;
	brand?: Record<string, unknown>;
}

function parseOrgMetadata(raw: string | null): OrgMetadata {
	if (!raw) {
		return {};
	}
	try {
		const parsed = JSON.parse(raw);
		if (parsed && typeof parsed === "object") {
			return parsed as OrgMetadata;
		}
	} catch {
		// ignore
	}
	return {};
}

export const listOrgs = platformAdminProcedure
	.route({
		method: "GET",
		path: "/platform/orgs",
		tags: ["Platform"],
		summary: "List all organizations across the platform",
	})
	.input(z.object({}).optional())
	.handler(async () => {
		const orgs = await db.organization.findMany({
			orderBy: { createdAt: "desc" },
			include: {
				_count: { select: { members: true } },
				purchases: {
					where: {
						status: { in: ACTIVE_PURCHASE_STATUSES },
					},
					select: { id: true },
				},
			},
		});

		return orgs.map((org) => {
			const metadata = parseOrgMetadata(org.metadata);
			return {
				id: org.id,
				name: org.name,
				slug: org.slug,
				memberCount: org._count.members,
				activeSubscriptionCount: org.purchases.length,
				circleCommunityId: metadata.circle?.communityId ?? null,
				createdAt: org.createdAt,
			};
		});
	});
