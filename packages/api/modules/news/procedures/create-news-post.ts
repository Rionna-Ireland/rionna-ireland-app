import { ORPCError } from "@orpc/server";
import { createNewsPost as createNewsPostDb, getNewsPostBySlug } from "@repo/database";
import slugify from "@sindresorhus/slugify";
import { nanoid } from "nanoid";
import { z } from "zod";

import { adminProcedure } from "../../../orpc/procedures";

export const createNewsPost = adminProcedure
	.route({
		method: "POST",
		path: "/admin/news",
		tags: ["News"],
		summary: "Create a news post",
	})
	.input(
		z.object({
			organizationId: z.string(),
			title: z.string().min(1),
			subtitle: z.string().optional(),
			featuredImageUrl: z.string().optional(),
			contentJson: z.unknown().optional(),
			contentHtml: z.string().optional(),
			publish: z.boolean().default(false),
			notifyMembersOnPublish: z.boolean().default(false),
		}),
	)
	.handler(async ({ input, context }) => {
		const baseSlug = slugify(input.title, { lowercase: true });

		let slug = baseSlug;
		let hasAvailableSlug = false;

		for (let i = 0; i < 3; i++) {
			const existing = await getNewsPostBySlug(input.organizationId, slug);

			if (!existing) {
				hasAvailableSlug = true;
				break;
			}

			slug = `${baseSlug}-${nanoid(5)}`;
		}

		if (!hasAvailableSlug) {
			throw new ORPCError("INTERNAL_SERVER_ERROR");
		}

		const post = await createNewsPostDb({
			organizationId: input.organizationId,
			slug,
			title: input.title,
			subtitle: input.subtitle ?? null,
			featuredImageUrl: input.featuredImageUrl ?? null,
			contentJson: input.contentJson ?? null,
			contentHtml: input.contentHtml ?? null,
			publishedAt: input.publish ? new Date() : null,
			notifyMembersOnPublish: input.notifyMembersOnPublish,
			authorUserId: context.user.id,
		});

		return post;
	});
