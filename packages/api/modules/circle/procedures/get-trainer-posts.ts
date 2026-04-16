import { ORPCError } from "@orpc/server";
import { db } from "@repo/database";
import { createCircleService } from "@repo/payments/lib/circle";
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

		// Parse org metadata to get trainerUpdatesSpaceId
		const metadata = org.metadata ? JSON.parse(org.metadata as string) : {};
		const spaceId = metadata?.circle?.trainerUpdatesSpaceId;
		if (!spaceId) return [];

		const service = createCircleService(org.slug);
		const { accessToken } = await service.getMemberToken(user.id);

		const response = await fetch(
			`https://app.circle.so/api/headless/v1/spaces/${spaceId}/posts?per_page=${input.limit}&sort=latest`,
			{ headers: { Authorization: `Bearer ${accessToken}` } },
		);

		if (!response.ok) return [];

		const data = await response.json();
		return data.records ?? [];
	});
