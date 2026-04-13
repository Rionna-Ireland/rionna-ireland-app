import { getTrainersByOrganization } from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../../orpc/procedures";

export const listTrainers = adminProcedure
	.route({
		method: "GET",
		path: "/admin/trainers",
		tags: ["Horses"],
		summary: "List trainers",
		description: "List all trainers for an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		return getTrainersByOrganization(input.organizationId);
	});
