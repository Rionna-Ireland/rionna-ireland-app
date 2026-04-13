/**
 * Push notification stub (no-op)
 *
 * Placeholder for S2-04 (Push Notification Pipeline). Logs to console
 * instead of actually sending push notifications.
 *
 * @see Architecture/specs/S2-04-push-notification-pipeline.md
 */

import { logger } from "@repo/logs";

export interface SendPushParams {
  organizationId: string;
  triggerType: string;
  triggerRefId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

export async function sendPush(params: SendPushParams): Promise<void> {
  logger.info("[sendPush stub] Push notification queued (no-op)", {
    organizationId: params.organizationId,
    triggerType: params.triggerType,
    triggerRefId: params.triggerRefId,
    title: params.title,
  });
}
