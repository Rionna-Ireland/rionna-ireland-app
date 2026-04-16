import { getLatestResults } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../../orpc/procedures";

export const getLatestResultsProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/horses/latest-results",
		tags: ["Horses"],
		summary: "Get latest race results",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().min(1).max(20).default(3),
		}),
	)
	.handler(async ({ input }) => {
		return getLatestResults(input.organizationId, input.limit);
	});
