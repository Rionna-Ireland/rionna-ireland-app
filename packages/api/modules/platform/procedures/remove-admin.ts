import { ORPCError } from "@orpc/client";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { z } from "zod";

import { platformAdminProcedure } from "../../../orpc/procedures";

export const removeAdmin = platformAdminProcedure
	.route({
		method: "POST",
		path: "/platform/orgs/{organizationId}/remove-admin",
		tags: ["Platform"],
		summary: "Remove an admin from an organization (does not delete the user)",
	})
	.input(
		z.object({
			organizationId: z.string(),
			memberId: z.string(),
		}),
	)
	.handler(async ({ input: { organizationId, memberId }, context }) => {
		const member = await db.member.findUnique({ where: { id: memberId } });

		if (!member || member.organizationId !== organizationId) {
			throw new ORPCError("NOT_FOUND");
		}

		if (member.role !== "admin") {
			throw new ORPCError("BAD_REQUEST", {
				message: "Member is not an admin of this organization",
			});
		}

		await db.member.delete({ where: { id: memberId } });

		logger.info("Platform admin removed organization admin", {
			event: "platform_admin_removed",
			platformAdminUserId: context.user.id,
			organizationId,
			memberId,
			removedUserId: member.userId,
		});

		return { ok: true };
	});
