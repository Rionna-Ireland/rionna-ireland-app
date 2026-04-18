import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { z } from "zod";

import { platformAdminProcedure } from "../../../orpc/procedures";

const ACTIVE_PURCHASE_STATUSES = ["active", "trialing", "past_due"];

export const getOrgDetail = platformAdminProcedure
	.route({
		method: "GET",
		path: "/platform/orgs/{organizationId}",
		tags: ["Platform"],
		summary: "Get full organization detail (admin roster, metadata, counts)",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId } }) => {
		const org = await db.organization.findUnique({
			where: { id: organizationId },
			include: {
				_count: { select: { members: true } },
				purchases: {
					where: {
						status: { in: ACTIVE_PURCHASE_STATUSES },
					},
					select: { id: true },
				},
				members: {
					where: { role: "admin" },
					include: {
						user: {
							select: {
								id: true,
								name: true,
								email: true,
								updatedAt: true,
							},
						},
					},
					orderBy: { createdAt: "asc" },
				},
				invitations: {
					where: { status: "pending" },
					orderBy: { createdAt: "desc" },
				},
			},
		});

		if (!org) {
			throw new ORPCError("NOT_FOUND");
		}

		let metadata: Record<string, unknown> = {};
		if (org.metadata) {
			try {
				const parsed = JSON.parse(org.metadata);
				if (parsed && typeof parsed === "object") {
					metadata = parsed as Record<string, unknown>;
				}
			} catch {
				// ignore
			}
		}

		return {
			id: org.id,
			name: org.name,
			slug: org.slug,
			createdAt: org.createdAt,
			memberCount: org._count.members,
			activeSubscriptionCount: org.purchases.length,
			metadata,
			admins: org.members.map((member) => ({
				memberId: member.id,
				userId: member.user.id,
				name: member.user.name,
				email: member.user.email,
				createdAt: member.createdAt,
				lastSeenAt: member.user.updatedAt,
				circleStatus: member.circleStatus,
			})),
			pendingInvitations: org.invitations.map((inv) => ({
				id: inv.id,
				email: inv.email,
				role: inv.role,
				status: inv.status,
				expiresAt: inv.expiresAt,
				createdAt: inv.createdAt,
			})),
		};
	});
