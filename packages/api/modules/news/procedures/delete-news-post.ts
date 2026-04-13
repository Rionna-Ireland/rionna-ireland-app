import { ORPCError } from "@orpc/server";
import { deleteNewsPost as deleteNewsPostDb, getNewsPostById } from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

export const deleteNewsPost = adminProcedure
	.route({
		method: "POST",
		path: "/admin/news/delete",
		tags: ["News"],
		summary: "Delete a news post",
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

		await deleteNewsPostDb(newsPostId);

		return { success: true };
	});
