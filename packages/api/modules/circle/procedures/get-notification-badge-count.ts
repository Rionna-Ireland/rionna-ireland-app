import { ORPCError } from "@orpc/server";
import { db } from "@repo/database";
import { logger } from "@repo/logs";
import {
	createCircleService,
	getCircleHeadlessApiBaseUrl,
} from "@repo/payments/lib/circle";
import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";

function countFromPayload(payload: unknown): number {
	if (!payload || typeof payload !== "object") return 0;
	const body = payload as Record<string, unknown>;
	const directCount =
		typeof body.count === "number"
			? body.count
			: typeof body.new_notifications_count === "number"
				? body.new_notifications_count
				: typeof body.total_count === "number"
					? body.total_count
					: null;

	if (directCount !== null) return Math.max(0, Math.floor(directCount));

	const records = body.records;
	if (Array.isArray(records)) return records.length;

	const chatRooms = body.chat_rooms;
	if (Array.isArray(chatRooms)) return chatRooms.length;

	return 0;
}

async function fetchCount(path: string, accessToken: string): Promise<number> {
	const response = await fetch(`${getCircleHeadlessApiBaseUrl()}${path}`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) return 0;
	return countFromPayload(await response.json());
}

export const getNotificationBadgeCount = protectedProcedure
	.route({
		method: "GET",
		path: "/circle/notification-badge-count",
		tags: ["Circle"],
		summary: "Get Circle unread notification count for the mobile app badge",
	})
	.input(z.object({ organizationId: z.string() }))
	.handler(async ({ input, context: { user } }) => {
		const org = await db.organization.findUnique({
			where: { id: input.organizationId },
		});
		if (!org?.slug) {
			throw new ORPCError("NOT_FOUND", { message: "Organization not found" });
		}

		const member = await db.member.findFirst({
			where: { userId: user.id, organizationId: input.organizationId },
			select: { circleMemberId: true },
		});
		if (!member?.circleMemberId) return { count: 0 };

		const service = createCircleService(org.slug);
		const tokenOutcome = await service.getMemberToken(member.circleMemberId);
		if (!tokenOutcome.ok) {
			logger.warn("[Circle] Badge count: token mint failed", {
				surface: "circle.notification_badge_count",
				userId: user.id,
				organizationId: input.organizationId,
				circleMemberId: member.circleMemberId,
				reason: tokenOutcome.reason,
				retriable: tokenOutcome.retriable,
			});
			return { count: 0 };
		}

		try {
			const [notifications, unreadRooms] = await Promise.all([
				fetchCount("/notifications/new_notifications_count", tokenOutcome.data.accessToken),
				fetchCount("/messages/unread_chat_rooms", tokenOutcome.data.accessToken),
			]);

			return { count: Math.min(99, notifications + unreadRooms) };
		} catch (error) {
			logger.warn("[Circle] Badge count fetch failed", {
				surface: "circle.notification_badge_count",
				userId: user.id,
				organizationId: input.organizationId,
				error: error instanceof Error ? error.message : String(error),
			});
			return { count: 0 };
		}
	});
