import { db } from "@repo/database";
import { parseOrgMetadata } from "@repo/database/types";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

export const getClubSettings = adminProcedure
	.route({
		method: "GET",
		path: "/admin/settings",
		tags: ["Admin"],
		summary: "Get club settings",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId } }) => {
		const organization = await db.organization.findUnique({
			where: { id: organizationId },
			select: { metadata: true },
		});

		return parseOrgMetadata(organization?.metadata ?? null);
	});
