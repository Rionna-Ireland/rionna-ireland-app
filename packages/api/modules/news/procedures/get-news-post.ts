import { ORPCError } from "@orpc/server";
import { getNewsPostById } from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

export const getNewsPost = adminProcedure
	.route({
		method: "GET",
		path: "/admin/news/{newsPostId}",
		tags: ["News"],
		summary: "Get a news post",
	})
	.input(
		z.object({
			newsPostId: z.string(),
		}),
	)
	.handler(async ({ input: { newsPostId } }) => {
		const post = await getNewsPostById(newsPostId);

		if (!post) {
			throw new ORPCError("NOT_FOUND");
		}

		return post;
	});
