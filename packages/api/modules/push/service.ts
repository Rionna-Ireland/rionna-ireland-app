/**
 * Push notification service (Expo Server SDK)
 *
 * Central function for sending push notifications. Handles audience
 * targeting, Expo SDK batching, and PushLog persistence.
 *
 * @see Architecture/specs/S2-04-push-notification-pipeline.md
 */

import { db } from "@repo/database";
import type { PushTriggerType } from "@repo/database";
import { logger } from "@repo/logs";
import Expo, { type ExpoPushMessage } from "expo-server-sdk";

import { getAudienceTokens } from "./audience";

const expo = new Expo();

export interface PushRequest {
	organizationId: string;
	triggerType: PushTriggerType | string;
	triggerRefId: string;
	title: string;
	body: string;
	data?: Record<string, string>;
	/** If set, only push to this user. Otherwise, push to all org members with relevant prefs. */
	targetUserId?: string;
}

export async function sendPush(request: PushRequest): Promise<void> {
	const tokens = await getAudienceTokens({
		organizationId: request.organizationId,
		triggerType: request.triggerType as PushTriggerType,
		targetUserId: request.targetUserId,
	});

	if (tokens.length === 0) {
		logger.info("[sendPush] No audience tokens found, skipping", {
			organizationId: request.organizationId,
			triggerType: request.triggerType,
		});
		return;
	}

	const messages: ExpoPushMessage[] = tokens.map((token) => ({
		to: token.expoPushToken,
		title: request.title,
		body: request.body,
		data: request.data,
		sound: "default" as const,
	}));

	const chunks = expo.chunkPushNotifications(messages);

	for (const chunk of chunks) {
		try {
			const receipts = await expo.sendPushNotificationsAsync(chunk);

			for (let i = 0; i < chunk.length; i++) {
				const tokenIndex = messages.indexOf(chunk[i]);
				const receipt = receipts[i];
				const token = tokens[tokenIndex >= 0 ? tokenIndex : i];

				await db.pushLog.create({
					data: {
						organizationId: request.organizationId,
						userId: token.userId,
						expoPushToken: token.expoPushToken,
						title: request.title,
						body: request.body,
						data: request.data ?? undefined,
						triggerType: request.triggerType as PushTriggerType,
						triggerRefId: request.triggerRefId,
						status: receipt.status === "ok" ? "SENT" : "FAILED",
						error:
							receipt.status === "error"
								? receipt.message
								: null,
						sentAt: new Date(),
					},
				});
			}
		} catch (error) {
			logger.error("[sendPush] Expo send failed", { error });
		}
	}
}
