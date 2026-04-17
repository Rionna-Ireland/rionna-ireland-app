import { db } from "@repo/database";

import { protectedProcedure } from "../../../orpc/procedures";

export const getPreferences = protectedProcedure
	.route({
		method: "GET",
		path: "/users/preferences",
		tags: ["Users"],
		summary: "Get the authenticated user's notification preferences",
	})
	.handler(async ({ context: { user } }) => {
		const row = await db.user.findUniqueOrThrow({
			where: { id: user.id },
			select: {
				pushEnabled: true,
				pushPreferences: true,
				emailPreferences: true,
			},
		});

		return {
			pushEnabled: row.pushEnabled,
			pushPreferences: (row.pushPreferences as Record<string, boolean>) ?? {},
			emailPreferences:
				(row.emailPreferences as Record<string, boolean>) ?? {},
		};
	});
