import { countNewsPosts, getNewsPosts } from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

export const listNewsPosts = adminProcedure
	.route({
		method: "GET",
		path: "/admin/news",
		tags: ["News"],
		summary: "List news posts",
	})
	.input(
		z.object({
			organizationId: z.string(),
			status: z.enum(["draft", "published"]).optional(),
			limit: z.number().min(1).max(100).default(10),
			offset: z.number().min(0).default(0),
		}),
	)
	.handler(async ({ input: { organizationId, status, limit, offset } }) => {
		const posts = await getNewsPosts({
			organizationId,
			status,
			limit,
			offset,
		});

		const total = await countNewsPosts({ organizationId, status });

		return { posts, total };
	});
