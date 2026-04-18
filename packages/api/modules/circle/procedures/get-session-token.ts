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
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const getSessionToken = protectedProcedure
	.route({
		method: "POST",
		path: "/circle/session-token",
		tags: ["Circle"],
		summary: "Get Circle session token for authenticated user",
	})
	.input(
		z.object({
			organizationId: z.string().optional(),
		}),
	)
	.handler(async ({ input, context: { session, user } }) => {
		const requestedOrganizationId = input.organizationId?.trim() || null;
		let organizationId = session.activeOrganizationId;

		async function activateOrganization(nextOrganizationId: string) {
			const membership = await db.member.findFirst({
				where: {
					userId: user.id,
					organizationId: nextOrganizationId,
				},
				select: { id: true },
			});

			if (!membership) {
				throw new ORPCError("FORBIDDEN", { message: "User is not a member of the requested organization" });
			}

			await db.$transaction([
				db.user.update({
					where: { id: user.id },
					data: { lastActiveOrganizationId: nextOrganizationId },
				}),
				db.session.update({
					where: { id: session.id },
					data: { activeOrganizationId: nextOrganizationId },
				}),
			]);

			return nextOrganizationId;
		}

		if (requestedOrganizationId && requestedOrganizationId !== organizationId) {
			organizationId = await activateOrganization(requestedOrganizationId);
		}
		else if (!organizationId) {
			const persistedUser = await db.user.findUnique({
				where: { id: user.id },
				select: { lastActiveOrganizationId: true },
			});
			const fallbackOrganizationId = persistedUser?.lastActiveOrganizationId || null;

			if (!fallbackOrganizationId) {
				throw new ORPCError("BAD_REQUEST", { message: "No active organization" });
			}

			organizationId = await activateOrganization(fallbackOrganizationId);
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
