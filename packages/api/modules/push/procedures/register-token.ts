import { db } from "@repo/database";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

export const registerPushToken = protectedProcedure
	.route({
		method: "POST",
		path: "/push/register",
		tags: ["Push"],
		summary: "Register an Expo push token for the authenticated user",
	})
	.input(
		z.object({
			expoPushToken: z.string(),
			platform: z.enum(["IOS", "ANDROID"]),
			deviceLabel: z.string().optional(),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		await db.pushToken.upsert({
			where: { expoPushToken: input.expoPushToken },
			create: {
				userId: user.id,
				expoPushToken: input.expoPushToken,
				platform: input.platform,
				deviceLabel: input.deviceLabel,
				lastSeenAt: new Date(),
			},
			update: {
				userId: user.id,
				lastSeenAt: new Date(),
			},
		});

		return { success: true };
	});
