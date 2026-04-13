/**
 * News notification email sender
 *
 * Sends a news notification email to all eligible members when
 * an admin publishes a news post with "notify members" enabled.
 *
 * Uses opt-out model: members receive emails unless they have
 * explicitly set emailPreferences.newsPost = false.
 *
 * @see Architecture/specs/S2-05-transactional-email.md
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";
import { sendEmail } from "@repo/mail";
import { getBaseUrl } from "@repo/utils";

export async function sendNewsNotificationEmails(post: {
	id: string;
	organizationId: string;
	title: string;
	subtitle: string | null;
	featuredImageUrl: string | null;
	slug: string;
}): Promise<void> {
	const org = await db.organization.findUnique({
		where: { id: post.organizationId },
	});

	if (!org) {
		return;
	}

	const members = await db.member.findMany({
		where: { organizationId: post.organizationId },
		include: {
			user: {
				select: {
					email: true,
					emailPreferences: true,
					locale: true,
				},
			},
		},
	});

	const eligibleMembers = members.filter((m) => {
		const prefs =
			(m.user.emailPreferences as Record<string, boolean>) ?? {};
		return prefs.newsPost !== false; // Default true (opt-out model)
	});

	const baseUrl = getBaseUrl(process.env.NEXT_PUBLIC_SAAS_URL, 3000);
	const postUrl = `${baseUrl}/news/${post.slug}`;

	for (const member of eligibleMembers) {
		try {
			await sendEmail({
				to: member.user.email,
				templateId: "newsNotification",
				context: {
					title: post.title,
					subtitle: post.subtitle,
					featuredImageUrl: post.featuredImageUrl,
					postUrl,
					clubName: org.name,
				},
				locale: (member.user.locale as "en") ?? "en",
			});
		} catch (error) {
			logger.error(
				`Failed to send news email to ${member.user.email}`,
				{ error },
			);
		}
	}
}
