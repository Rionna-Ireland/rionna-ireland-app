import { ORPCError } from "@orpc/client";
import { db, getUserByEmail } from "@repo/database";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";
import { getBaseUrl } from "@repo/utils";
import { z } from "zod";

import { platformAdminProcedure } from "../../../orpc/procedures";

const slugRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const hexColourRegex = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

const inputSchema = z.object({
	name: z.string().min(1).max(64),
	slug: z
		.string()
		.min(2)
		.max(48)
		.regex(slugRegex, "Slug must be kebab-case (lowercase, hyphens between words)"),
	primaryColor: z.string().regex(hexColourRegex).optional(),
	logoUrl: z.url().optional(),
	adminEmail: z.email(),
});

export const createOrg = platformAdminProcedure
	.route({
		method: "POST",
		path: "/platform/orgs",
		tags: ["Platform"],
		summary: "Create a new organization and invite its first admin",
	})
	.input(inputSchema)
	.handler(async ({ input, context }) => {
		const { name, slug, primaryColor, logoUrl, adminEmail } = input;

		const existing = await db.organization.findUnique({ where: { slug } });
		if (existing) {
			throw new ORPCError("CONFLICT", { message: "Slug already in use" });
		}

		const metadata = {
			racing: {},
			circle: {},
			billing: {},
			brand: {
				primaryColor: primaryColor ?? null,
				logoUrl: logoUrl ?? null,
			},
		};

		// Better Auth's createOrganization endpoint adds the creator as an
		// "owner" Member and switches their active org to the new one. Neither is
		// what we want here: platform admins shouldn't accumulate Member rows in
		// every org they provision, and we want to keep their session anchored
		// on /platform.
		//
		// Workaround: create the Organization row directly, then issue the admin
		// invitation through Better Auth (which only needs a valid org and the
		// platform admin's session).
		const created = await db.organization.create({
			data: {
				name,
				slug,
				logo: logoUrl,
				metadata: JSON.stringify(metadata),
				createdAt: new Date(),
			},
		});

		// Better Auth's createInvitation requires the caller to be a Member with
		// invite permission, which the platform admin isn't. Issue the row
		// directly and trigger the same email template Better Auth would.
		const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 48); // 48h
		try {
			const invitation = await db.invitation.create({
				data: {
					email: adminEmail.toLowerCase(),
					role: "admin",
					organizationId: created.id,
					inviterId: context.user.id,
					status: "pending",
					expiresAt,
				},
			});

			const existingUser = await getUserByEmail(adminEmail);
			const url = new URL(
				existingUser ? "/login" : "/signup",
				getBaseUrl(process.env.NEXT_PUBLIC_SAAS_URL, 3000),
			);
			url.searchParams.set("invitationId", invitation.id);
			url.searchParams.set("email", adminEmail);

			await sendEmail({
				to: adminEmail,
				templateId: "organizationInvitation",
				context: {
					organizationName: created.name,
					url: url.toString(),
				},
			});
		} catch (error) {
			logger.error("Failed to create initial admin invitation", {
				organizationId: created.id,
				adminEmail,
				error: error instanceof Error ? error.message : String(error),
			});
			throw new ORPCError("INTERNAL_SERVER_ERROR", {
				message:
					"Org created but admin invitation failed — invite manually from /platform/orgs/[id]",
			});
		}

		logger.info("Platform admin created organization", {
			event: "platform_org_created",
			platformAdminUserId: context.user.id,
			organizationId: created.id,
			slug: created.slug,
			adminEmail,
		});

		return {
			id: created.id,
			slug: created.slug,
		};
	});
