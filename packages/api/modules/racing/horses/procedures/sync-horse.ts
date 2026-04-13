import { ORPCError } from "@orpc/client";
import { db, parseOrgMetadata } from "@repo/database";
import { z } from "zod";

import { adminProcedure } from "../../../../orpc/procedures";
import { createRacingProvider } from "../../provider/index";

export const syncHorse = adminProcedure
	.route({
		method: "POST",
		path: "/admin/horses/{horseId}/sync",
		tags: ["Horses"],
		summary: "Sync horse from provider",
		description: "Sync horse pedigree data from the racing data provider",
	})
	.input(
		z.object({
			horseId: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		const horse = await db.horse.findUnique({
			where: { id: input.horseId },
		});

		if (!horse?.providerEntityId) {
			throw new ORPCError("BAD_REQUEST", {
				message: "No provider link",
			});
		}

		const org = await db.organization.findUnique({
			where: { id: horse.organizationId },
		});

		if (!org) {
			throw new ORPCError("NOT_FOUND", {
				message: "Organization not found",
			});
		}

		const metadata = parseOrgMetadata(org.metadata as string);
		const provider = createRacingProvider(metadata.racing?.provider ?? "manual");
		const profile = await provider.getHorseProfile(horse.providerEntityId);

		const updated = await db.horse.update({
			where: { id: horse.id },
			data: {
				pedigree: {
					sire: profile.sire,
					dam: profile.dam,
					damsire: profile.damsire,
				},
				providerLastSync: new Date(),
			},
			include: {
				trainer: {
					select: { id: true, name: true },
				},
			},
		});

		return updated;
	});
