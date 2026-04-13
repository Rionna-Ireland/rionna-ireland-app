import { ORPCError } from "@orpc/client";
import { getHorseById } from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../../orpc/procedures";

export const getHorse = adminProcedure
	.route({
		method: "GET",
		path: "/admin/horses/{horseId}",
		tags: ["Horses"],
		summary: "Get horse",
		description: "Get a single horse by ID",
	})
	.input(
		z.object({
			horseId: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		const horse = await getHorseById(input.horseId);

		if (!horse) {
			throw new ORPCError("NOT_FOUND", { message: "Horse not found" });
		}

		return horse;
	});
