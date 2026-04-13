import { getHorses } from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../../orpc/procedures";

export const listHorses = adminProcedure
	.route({
		method: "GET",
		path: "/admin/horses",
		tags: ["Horses"],
		summary: "List horses",
		description: "List all horses for an organization with optional filtering",
	})
	.input(
		z.object({
			organizationId: z.string(),
			status: z
				.enum(["PRE_TRAINING", "IN_TRAINING", "REHAB", "RETIRED", "SOLD"])
				.optional(),
			sort: z.enum(["sortOrder", "name", "publishedAt"]).optional(),
			limit: z.number().min(1).max(100).default(20),
			offset: z.number().min(0).default(0),
		}),
	)
	.handler(async ({ input }) => {
		return getHorses({
			organizationId: input.organizationId,
			status: input.status,
			sort: input.sort,
			limit: input.limit,
			offset: input.offset,
		});
	});
