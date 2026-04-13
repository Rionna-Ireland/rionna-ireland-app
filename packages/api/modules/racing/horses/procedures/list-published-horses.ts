import { getPublishedHorses } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../../orpc/procedures";

export const listPublishedHorses = protectedProcedure
	.route({
		method: "GET",
		path: "/horses",
		tags: ["Horses"],
		summary: "List published horses",
		description: "List all published horses for an organization, visible to members",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		return getPublishedHorses(input.organizationId);
	});
