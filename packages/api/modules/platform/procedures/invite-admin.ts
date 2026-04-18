import { ORPCError } from "@orpc/client";
import { db, getUserByEmail } from "@repo/database";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";
import { getBaseUrl } from "@repo/utils";
import { z } from "zod";

import { platformAdminProcedure } from "../../../orpc/procedures";

export const inviteAdmin = platformAdminProcedure
	.route({
		method: "POST",
		path: "/platform/orgs/{organizationId}/invite-admin",
		tags: ["Platform"],
		summary: "Invite a new admin to an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
			email: z.email(),
		}),
	)
	.handler(async ({ input: { organizationId, email }, context }) => {
		const org = await db.organization.findUnique({ where: { id: organizationId } });
		if (!org) {
			throw new ORPCError("NOT_FOUND");
		}

		const normalisedEmail = email.toLowerCase();
		const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h

		// De-dupe: if a pending invitation already exists for this org+email,
		// surface it instead of stacking duplicate rows on every click.
		const existingPending = await db.invitation.findFirst({
			where: {
				organizationId,
				email: normalisedEmail,
				status: "pending",
				expiresAt: { gt: new Date() },
			},
			select: { id: true, email: true },
		});
		if (existingPending) {
			throw new ORPCError("CONFLICT", {
				message: "A pending invitation for this email already exists.",
			});
		}

		// Bypass Better Auth's createInvitation (which gates on Member existence)
		// and write the row directly, then trigger the same email template.
		try {
			const invitation = await db.invitation.create({
				data: {
					email: normalisedEmail,
					role: "admin",
					organizationId,
					inviterId: context.user.id,
					status: "pending",
					expiresAt,
				},
			});

			const existingUser = await getUserByEmail(normalisedEmail);
			const url = new URL(
				existingUser ? "/login" : "/signup",
				getBaseUrl(process.env.NEXT_PUBLIC_SAAS_URL, 3000),
			);
			url.searchParams.set("invitationId", invitation.id);
			url.searchParams.set("email", normalisedEmail);

			await sendEmail({
				to: normalisedEmail,
				templateId: "organizationInvitation",
				context: {
					organizationName: org.name,
					url: url.toString(),
				},
			});

			logger.info("Platform admin invited admin", {
				event: "platform_admin_invited",
				platformAdminUserId: context.user.id,
				organizationId,
				invitationId: invitation.id,
				email: normalisedEmail,
			});

			return {
				id: invitation.id,
				email: normalisedEmail,
			};
		} catch (error) {
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message: error instanceof Error ? error.message : "Failed to send invitation",
			});
		}
	});
