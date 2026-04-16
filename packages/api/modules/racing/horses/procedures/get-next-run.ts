import { getNextRun } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../../orpc/procedures";

export const getNextRunProcedure = protectedProcedure
	.route({
		method: "GET",
		path: "/horses/next-run",
		tags: ["Horses"],
		summary: "Get next declared run across all horses",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		return getNextRun(input.organizationId);
	});
