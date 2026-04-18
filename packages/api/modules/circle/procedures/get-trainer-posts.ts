import { ORPCError } from "@orpc/server";
import { db, parseOrgMetadata } from "@repo/database";
import {
	buildCircleCommunityTargetUrl,
	createCircleService,
	getCircleHeadlessApiBaseUrl,
} from "@repo/payments/lib/circle";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const getTrainerPosts = protectedProcedure
	.route({
		method: "GET",
		path: "/circle/trainer-posts",
		tags: ["Circle"],
		summary: "Get latest trainer update posts from Circle",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().min(1).max(10).default(3),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
		});
		if (!org?.slug) {
			throw new ORPCError("NOT_FOUND", { message: "Organization not found" });
		}

		const metadata = parseOrgMetadata(org.metadata as string | null);
		const spaceId = metadata.circle?.trainerUpdatesSpaceId;
		if (!spaceId) return [];

		const service = createCircleService(org.slug);
		const { accessToken } = await service.getMemberToken(user.id);

		const response = await fetch(
			`${getCircleHeadlessApiBaseUrl()}/spaces/${spaceId}/posts?per_page=${input.limit}&sort=latest`,
			{ headers: { Authorization: `Bearer ${accessToken}` } },
		);

		if (!response.ok) return [];

		const data = (await response.json()) as { records?: Array<Record<string, unknown>> };
		return (data.records ?? []).map((post) => ({
			...post,
			url:
				buildCircleCommunityTargetUrl({
					communityDomain: metadata.circle?.communityDomain,
					realPath: `/posts/${post.id}`,
					mockPath: `/__mock/ui/member/posts/${post.id}`,
				}) ?? post.url,
		}));
	});
