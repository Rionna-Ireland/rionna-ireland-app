/**
 * Circle/Stripe Reconciliation
 *
 * Safety net that runs daily to catch anything the Stripe webhook
 * hot path missed (D9: "No heroic retry logic in the webhook hot path").
 *
 * Two sweeps per organization:
 * 1. Provision: active Purchase but no circleMemberId → create in Circle
 * 2. Deactivate: canceled/expired Purchase but circleStatus = "active" → remove from Circle
 *
 * Each member is processed independently — one failure doesn't block others.
 *
 * @see Architecture/specs/S1-06-reconciliation-cron.md
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { createCircleService } from "@repo/payments/lib/circle";

export async function reconcileCircleMembers(
	organizationId: string,
): Promise<{ provisioned: number; deactivated: number; errors: number }> {
	const org = await db.organization.findUnique({
		where: { id: organizationId },
	});
	if (!org?.slug) {
		logger.warn("[Reconciliation] Organization not found or missing slug", {
			organizationId,
		});
		return { provisioned: 0, deactivated: 0, errors: 0 };
	}

	const circle = createCircleService(org.slug);

	let provisioned = 0;
	let deactivated = 0;
	let errors = 0;

	// 1. Active Purchase but no circleMemberId → provision
	const unprovisionedMembers = await db.member.findMany({
		where: {
			organizationId,
			circleMemberId: null,
			user: {
				purchases: {
					some: {
						status: { in: ["active", "trialing", "past_due"] },
					},
				},
			},
		},
		include: { user: true },
	});

	for (const member of unprovisionedMembers) {
		try {
			const result = await circle.createMember({
				email: member.user.email,
				name: member.user.name ?? member.user.email,
				ssoUserId: member.userId,
				idempotencyKey: `reconcile-provision-${member.id}`,
			});

			await db.member.update({
				where: { id: member.id },
				data: {
					circleMemberId: result.circleMemberId,
					circleProvisionedAt: new Date(),
					circleStatus: "active",
				},
			});

			provisioned++;
			logger.info("[Reconciliation] Provisioned Circle member", {
				userId: member.userId,
				orgId: organizationId,
				circleMemberId: result.circleMemberId,
			});
		} catch (error) {
			errors++;
			logger.error("[Reconciliation] Failed to provision member", {
				userId: member.userId,
				orgId: organizationId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	// 2. Canceled/expired Purchase but circleStatus = "active" → deactivate
	const staleActiveMembers = await db.member.findMany({
		where: {
			organizationId,
			circleStatus: "active",
			circleMemberId: { not: null },
			user: {
				purchases: {
					every: {
						status: { in: ["canceled", "expired"] },
					},
				},
			},
		},
	});

	for (const member of staleActiveMembers) {
		try {
			await circle.deactivateMember(member.circleMemberId!);

			await db.member.update({
				where: { id: member.id },
				data: { circleStatus: "deactivated" },
			});

			deactivated++;
			logger.info("[Reconciliation] Deactivated Circle member", {
				userId: member.userId,
				orgId: organizationId,
				circleMemberId: member.circleMemberId,
			});
		} catch (error) {
			errors++;
			logger.error("[Reconciliation] Failed to deactivate member", {
				userId: member.userId,
				orgId: organizationId,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	return { provisioned, deactivated, errors };
}
