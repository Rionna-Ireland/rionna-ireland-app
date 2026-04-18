/**
 * Circle Session Token Endpoint
 *
 * Mints a Circle Member API Token for the authenticated user.
 * Used by the mobile WebView (S3-04) and web app to inject
 * Circle session cookies.
 *
 * @see Architecture/specs/S1-05-circle-provisioning.md
 */

import { ORPCError } from "@orpc/server";
import { db, parseOrgMetadata } from "@repo/database";
import {
	buildCircleCommunityTargetUrl,
	createCircleService,
	getCircleCommunityBaseUrl,
	getCircleMode,
} from "@repo/payments/lib/circle";

import { protectedProcedure } from "../../../orpc/procedures";

export const getSessionToken = protectedProcedure
	.route({
		method: "POST",
		path: "/circle/session-token",
		tags: ["Circle"],
		summary: "Get Circle session token for authenticated user",
	})
	.handler(async ({ context: { session, user } }) => {
		const organizationId = session.activeOrganizationId;
		if (!organizationId) {
			throw new ORPCError("BAD_REQUEST", { message: "No active organization" });
		}

		const org = await db.organization.findUnique({
			where: { id: organizationId },
		});
		if (!org?.slug) {
			throw new ORPCError("NOT_FOUND", { message: "Organization not found" });
		}

		const service = createCircleService(org.slug);
		const tokens = await service.getMemberToken(user.id);
		const metadata = parseOrgMetadata(org.metadata as string | null);

		return {
			accessToken: tokens.accessToken,
			mode: getCircleMode(),
			communityBaseUrl: getCircleCommunityBaseUrl(metadata.circle?.communityDomain),
			defaultCommunityUrl: buildCircleCommunityTargetUrl({
				communityDomain: metadata.circle?.communityDomain,
				realPath: "",
				mockPath: "/__mock/ui/member",
			}),
		};
	});
