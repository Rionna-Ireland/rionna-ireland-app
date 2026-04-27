import { ORPCError } from "@orpc/server";
import { db, parseOrgMetadata } from "@repo/database";
import { logger } from "@repo/logs";
import {
	buildCircleCommunityTargetUrl,
	createCircleService,
	getCircleHeadlessApiBaseUrl,
} from "@repo/payments/lib/circle";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

function textValue(value: unknown): string | null {
	return typeof value === "string" && value.trim().length > 0
		? value.trim()
		: null;
}

function cleanTextValue(value: unknown): string | null {
	const text = textValue(value);
	if (!text) return null;

	const stripped = text
		.replace(/<\s*br\s*\/?>/gi, " ")
		.replace(/<\s*\/?(div|p|li|ul|ol|strong|em|span|h[1-6])[^>]*>/gi, " ")
		.replace(/<[^>]+>/g, " ")
		.replace(/&nbsp;/gi, " ")
		.replace(/&amp;/gi, "&")
		.replace(/&lt;/gi, "<")
		.replace(/&gt;/gi, ">")
		.replace(/&quot;/gi, "\"")
		.replace(/&#39;/gi, "'")
		.replace(/\s+/g, " ")
		.trim();

	if (!stripped) return null;

	const normalized = stripped.toLowerCase();
	if (
		normalized === "update available please update the app to view this post."
		|| normalized === "update available please update the app to view this post"
	) {
		return null;
	}

	return stripped;
}

function objectValue(value: unknown): Record<string, unknown> | null {
	return value && typeof value === "object" && !Array.isArray(value)
		? value as Record<string, unknown>
		: null;
}

function arrayValue(value: unknown): Array<Record<string, unknown>> {
	return Array.isArray(value)
		? value.filter((item): item is Record<string, unknown> => objectValue(item) !== null)
		: [];
}

function extractPosts(payload: unknown): Array<Record<string, unknown>> {
	if (Array.isArray(payload)) return arrayValue(payload);

	const body = objectValue(payload);
	if (!body) return [];

	const data = objectValue(body.data);
	return (
		arrayValue(body.records)
		.length > 0 ? arrayValue(body.records)
			: arrayValue(body.posts).length > 0 ? arrayValue(body.posts)
				: arrayValue(body.items).length > 0 ? arrayValue(body.items)
					: data && arrayValue(data.records).length > 0 ? arrayValue(data.records)
						: data && arrayValue(data.posts).length > 0 ? arrayValue(data.posts)
							: data && arrayValue(data.items).length > 0 ? arrayValue(data.items)
								: []
	);
}

function extractTiptapText(value: unknown): string | null {
	const node = objectValue(value);
	if (!node) return null;

	const nodeText =
		cleanTextValue(node.text)
		?? cleanTextValue(node.circle_ios_fallback_text);
	const children = Array.isArray(node.content)
		? node.content.map(extractTiptapText).filter(Boolean).join(" ")
		: null;

	return cleanTextValue([nodeText, children].filter(Boolean).join(" "));
}

function extractPostText(post: Record<string, unknown>): string | null {
	const body = objectValue(post.body);
	const tiptapBody = objectValue(post.tiptap_body);
	const tiptapDocument = objectValue(tiptapBody?.body);
	return (
		cleanTextValue(post.body_plain_text_without_attachments)
		?? cleanTextValue(post.body_plain_text)
		?? cleanTextValue(tiptapBody?.circle_ios_fallback_text)
		?? extractTiptapText(tiptapDocument)
		?? cleanTextValue(tiptapBody?.plain_text_body)
		?? cleanTextValue(tiptapBody?.text)
		?? cleanTextValue(body?.plain_text_body)
		?? cleanTextValue(post.body_text)
		?? cleanTextValue(post.description)
		?? cleanTextValue(post.excerpt)
		?? cleanTextValue(body?.body)
		?? cleanTextValue(body?.text)
		?? cleanTextValue(body?.html)
		?? cleanTextValue(post.name)
		?? cleanTextValue(post.title)
	);
}

function extractImageUrlFromHtml(value: unknown): string | null {
	const html = textValue(value);
	if (!html) return null;

	return textValue(html.match(/<img[^>]+src=["']([^"']+)["']/i)?.[1]);
}

function extractPostImageUrl(post: Record<string, unknown>): string | null {
	const body = objectValue(post.body);
	const tiptapBody = objectValue(post.tiptap_body);
	const inlineAttachments = Array.isArray(tiptapBody?.inline_attachments)
		? tiptapBody.inline_attachments
		: [];
	const firstInlineImage = inlineAttachments.find((attachment) => {
		const item = objectValue(attachment);
		return textValue(item?.url) && textValue(item?.content_type)?.startsWith("image/");
	});
	const firstInlineImageUrl = textValue(objectValue(firstInlineImage)?.url);

	return (
		textValue(post.cardview_image)
		?? textValue(post.cardview_image_url)
		?? textValue(post.cardview_thumbnail_url)
		?? textValue(post.cover_image_url)
		?? firstInlineImageUrl
		?? extractImageUrlFromHtml(body?.body)
		?? extractImageUrlFromHtml(body?.html)
	);
}

function extractSpaceName(post: Record<string, unknown>): string | null {
	const space = objectValue(post.space);
	return (
		textValue(space?.name)
		?? textValue(space?.title)
		?? textValue(space?.display_name)
		?? textValue(post.space_name)
		?? textValue(post.space_title)
	);
}

function extractSpaceSlug(post: Record<string, unknown>): string | null {
	const space = objectValue(post.space);
	return (
		textValue(space?.slug)
		?? textValue(post.space_slug)
	);
}

function extractAuthorName(post: Record<string, unknown>): string | null {
	const author =
		objectValue(post.author)
		?? objectValue(post.user)
		?? objectValue(post.community_member)
		?? objectValue(post.member);
	return (
		textValue(author?.name)
		?? textValue(author?.display_name)
		?? textValue(post.author_name)
		?? textValue(post.user_name)
	);
}

function numberValue(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function classifyFeedItem(
	post: Record<string, unknown>,
	spaceName: string | null,
): "news" | "post" {
	const haystack = [
		spaceName,
		textValue(post.name),
		textValue(post.title),
		textValue(post.post_type),
		textValue(post.kind),
	]
		.filter(Boolean)
		.join(" ")
		.toLowerCase();

	if (
		haystack.includes("news")
		|| haystack.includes("inside track")
		|| haystack.includes("announcement")
		|| haystack.includes("notice")
		|| haystack.includes("updates")
		|| haystack.includes("trainer update")
	) {
		return "news";
	}

	return "post";
}

function buildFallbackUrl(input: {
	communityDomain: string | undefined;
	id: string;
	slug: string | null;
	spaceSlug: string | null;
}): string | null {
	const realPath =
		input.spaceSlug && input.slug
			? `/c/${input.spaceSlug}/${input.slug}`
			: `/posts/${input.id}`;

	return buildCircleCommunityTargetUrl({
		communityDomain: input.communityDomain,
		realPath,
		mockPath: `/__mock/ui/member/posts/${input.id}`,
	});
}

export const getFeed = protectedProcedure
	.route({
		method: "GET",
		path: "/circle/feed",
		tags: ["Circle"],
		summary: "Get latest Circle home-feed posts for Pulse",
	})
	.input(
		z.object({
			organizationId: z.string(),
			limit: z.number().min(1).max(10).default(5),
		}),
	)
	.handler(async ({ input, context: { user } }) => {
		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
		});
		if (!org?.slug) {
			throw new ORPCError("NOT_FOUND", { message: "Organization not found" });
		}

		const metadata = parseOrgMetadata(org.metadata as string | null);
		const member = await db.member.findFirst({
			where: { userId: user.id, organizationId: input.organizationId },
			select: { circleMemberId: true },
		});
		if (!member?.circleMemberId) return [];

		const service = createCircleService(org.slug);
		const tokenOutcome = await service.getMemberToken(member.circleMemberId);
		if (!tokenOutcome.ok) {
			logger.warn("[Circle] Feed: token mint failed", {
				surface: "circle.feed",
				userId: user.id,
				organizationId: input.organizationId,
				circleMemberId: member.circleMemberId,
				reason: tokenOutcome.reason,
				retriable: tokenOutcome.retriable,
			});
			return [];
		}

		const response = await fetch(
			`${getCircleHeadlessApiBaseUrl()}/home?per_page=${input.limit}&sort=latest`,
			{ headers: { Authorization: `Bearer ${tokenOutcome.data.accessToken}` } },
		);

		if (!response.ok) {
			logger.warn("[Circle] Feed: Headless home fetch failed", {
				surface: "circle.feed",
				userId: user.id,
				organizationId: input.organizationId,
				status: response.status,
			});
			return [];
		}

		const data = await response.json();
		const posts = extractPosts(data);

		if (posts.length === 0) {
			logger.warn("[Circle] Feed: Headless home returned no mappable posts", {
				surface: "circle.feed",
				userId: user.id,
				organizationId: input.organizationId,
				responseKeys: objectValue(data) ? Object.keys(objectValue(data)!).sort() : [],
			});
		}

		return posts.map((post) => {
			const id = String(post.id ?? "");
			const spaceName = extractSpaceName(post);
			const fallbackUrl = buildFallbackUrl({
				communityDomain: metadata.circle?.communityDomain,
				id,
				slug: textValue(post.slug),
				spaceSlug: extractSpaceSlug(post),
			});

			return {
				id,
				title: textValue(post.name) ?? textValue(post.display_title) ?? textValue(post.title) ?? "Community post",
				excerpt: extractPostText(post),
				createdAt: textValue(post.created_at) ?? textValue(post.createdAt),
				spaceName,
				authorName: extractAuthorName(post),
				commentCount: numberValue(post.comment_count ?? post.comments_count ?? post.commentsCount),
				likeCount: numberValue(post.user_likes_count ?? post.likes_count ?? post.likesCount ?? post.like_count),
				imageUrl: extractPostImageUrl(post),
				kind: classifyFeedItem(post, spaceName),
				url:
					textValue(post.url)
					?? textValue(post.web_url)
					?? textValue(post.action_web_url)
					?? fallbackUrl,
			};
		});
	});
