/**
 * Circle Webhook Handler
 *
 * Handles HTTP POST from Circle Workflows when a new post is published
 * in the Trainer Updates space. Fires a push notification to all members.
 *
 * @see Architecture/specs/S2-04-push-notification-pipeline.md
 */

import { db, parseOrgMetadata } from "@repo/database";
import { logger } from "@repo/logs";
import { buildCircleCommunityTargetUrl } from "@repo/payments/lib/circle";

import { sendPush } from "../push/service";

export async function handleCircleWebhook(request: Request): Promise<Response> {
	try {
		const body = await request.json();

		if (!body.space_id) {
			return new Response("Missing space_id", { status: 400 });
		}

		// Find the org whose metadata contains this space ID as the trainer updates space
		const orgs = await db.organization.findMany({
			select: { id: true, metadata: true },
		});

		let matchedOrg: { id: string; trainerUpdatesSpaceId: string; communityDomain?: string } | null = null;

		for (const org of orgs) {
			const metadata = parseOrgMetadata(org.metadata as string | null);
			const circle = metadata.circle;
			if (circle?.trainerUpdatesSpaceId && circle.trainerUpdatesSpaceId === body.space_id) {
				matchedOrg = {
					id: org.id,
					trainerUpdatesSpaceId: circle.trainerUpdatesSpaceId,
					communityDomain: circle.communityDomain,
				};
				break;
			}
		}

		if (!matchedOrg) {
			logger.info("[Circle Webhook] No matching org for space_id", {
				spaceId: body.space_id,
			});
			return new Response("OK", { status: 200 });
		}

		const communityTargetUrl
			= typeof body.post_id === "number" || typeof body.post_id === "string"
				? buildCircleCommunityTargetUrl({
						communityDomain: matchedOrg.communityDomain,
						realPath: `/posts/${body.post_id}`,
						mockPath: `/__mock/ui/member/posts/${body.post_id}`,
					})
				: null;

		await sendPush({
			organizationId: matchedOrg.id,
			triggerType: "TRAINER_POST",
			triggerRefId: body.post_id ?? `circle-${Date.now()}`,
			title: "New trainer update",
			body: body.title ?? "Your trainer posted an update",
			data: {
				screen: "community",
				...(communityTargetUrl ? { url: communityTargetUrl } : {}),
			},
		});

		return new Response("OK", { status: 200 });
	} catch (error) {
		logger.error("[Circle Webhook] Processing failed", { error });
		return new Response("Webhook processing failed", { status: 500 });
	}
}
