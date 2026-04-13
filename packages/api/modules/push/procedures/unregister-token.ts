import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const unregisterPushToken = protectedProcedure
	.route({
		method: "POST",
		path: "/push/unregister",
		tags: ["Push"],
		summary: "Unregister an Expo push token (logout)",
	})
	.input(
		z.object({
			expoPushToken: z.string(),
		}),
	)
	.handler(async ({ input }) => {
		await db.pushToken.deleteMany({
			where: { expoPushToken: input.expoPushToken },
		});

		return { success: true };
	});
