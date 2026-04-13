import { ORPCError } from "@orpc/server";
import { getPublishedNewsPostBySlug } from "@repo/database";
import { z } from "zod";

import { publicProcedure } from "../../../orpc/procedures";

export const getPublishedNewsPost = publicProcedure
	.route({
		method: "GET",
		path: "/news/{slug}",
		tags: ["News"],
		summary: "Get a published news post by slug",
	})
	.input(
		z.object({
			organizationId: z.string(),
			slug: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId, slug } }) => {
		const post = await getPublishedNewsPostBySlug(organizationId, slug);

		if (!post) {
			throw new ORPCError("NOT_FOUND");
		}

		return {
			id: post.id,
			slug: post.slug,
			title: post.title,
			subtitle: post.subtitle,
			featuredImageUrl: post.featuredImageUrl,
			contentHtml: post.contentHtml,
			publishedAt: post.publishedAt,
			author: post.author,
		};
	});
