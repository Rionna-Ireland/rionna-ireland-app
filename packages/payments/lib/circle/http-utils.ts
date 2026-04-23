/**
 * Shared HTTP/wire utilities for Circle service implementations.
 *
 * Extracted from `real.ts` so both `RealCircleService` and
 * `MockServerCircleService` can reuse the same status classification,
 * id comparison, and notification normalisation logic without a
 * cross-file import cycle.
 */

import { logger } from "@repo/logs";
import type {
	CircleCallFailure,
	CircleNotification,
	CircleNotificationSubject,
	CircleNotificationType,
} from "./types";

/**
 * Map an HTTP status to a CircleCallFailure and retriable flag.
 */
export function classifyStatus(
	status: number,
): { reason: CircleCallFailure; retriable: boolean } {
	if (status === 401) return { reason: "auth", retriable: true };
	if (status === 403) return { reason: "forbidden", retriable: false };
	if (status === 404) return { reason: "not_found", retriable: false };
	if (status === 422) return { reason: "invalid_input", retriable: false };
	if (status === 429) return { reason: "rate_limited", retriable: true };
	if (status >= 500) return { reason: "server_error", retriable: true };
	// Any other 4xx: treat as invalid_input (client should not retry).
	return { reason: "invalid_input", retriable: false };
}

/**
 * Compare two numeric-as-string ids. Uses BigInt for large ids; falls back
 * to lexicographic compare if either id isn't a valid BigInt.
 */
export function compareIds(a: string, b: string): number {
	try {
		const zero = BigInt(0);
		const d = BigInt(a) - BigInt(b);
		return d < zero ? -1 : d > zero ? 1 : 0;
	} catch {
		return a < b ? -1 : a > b ? 1 : 0;
	}
}

/**
 * Map Circle's Headless notifications wire JSON to our CircleNotification.
 *
 * Returns null when the record is missing an `id` — such records would
 * corrupt the cursor (`id: "undefined"` becomes the next `after_id`), so
 * they must be dropped rather than normalised.
 */
export function normaliseCircleNotification(
	record: unknown,
): CircleNotification | null {
	const r = (record ?? {}) as Record<string, unknown>;

	if (r?.id == null) {
		logger.error("[RealCircle] Dropping notification with missing id", {
			record: r,
		});
		return null;
	}

	const typeMap: Record<string, CircleNotificationType> = {
		post_created: "post",
		post_mention: "mention",
		comment_created: "comment",
		comment_mention: "mention",
		reaction_created: "reaction",
		dm_received: "dm",
		event_reminder: "event_reminder",
		member_joined: "admin_event",
		content_flagged: "admin_event",
	};
	const rawType = String(r.notification_type ?? r.type ?? "");
	const type: CircleNotificationType = typeMap[rawType] ?? "post";
	if (!typeMap[rawType]) {
		logger.warn("[RealCircle] Unknown notification_type; falling back to 'post'", {
			rawType,
			notificationId: String(r.id),
		});
	}

	const subj = (r.subject ?? {}) as Record<string, unknown>;
	const rawSubjectKind = String(subj.type ?? subj.kind ?? "");
	const knownSubjectKinds: Record<string, CircleNotificationSubject["kind"]> = {
		post: "post",
		comment: "comment",
		dm: "dm",
		event: "event",
		member: "member",
	};
	const subjectKind: CircleNotificationSubject["kind"] =
		knownSubjectKinds[rawSubjectKind] ?? "post";
	if (!knownSubjectKinds[rawSubjectKind]) {
		logger.warn("[RealCircle] Unknown subject kind; defaulting to 'post'", {
			rawKind: subj?.type ?? subj?.kind ?? "(none)",
			notificationId: String(r.id ?? "(unknown)"),
		});
	}

	const actor = r.actor as { id?: unknown; name?: unknown } | null | undefined;

	return {
		id: String(r.id),
		type,
		createdAt: String(r.created_at ?? r.createdAt ?? ""),
		actor:
			actor && actor.id !== undefined
				? { id: String(actor.id), name: String(actor.name ?? "") }
				: null,
		subject: {
			kind: subjectKind,
			id: String(subj.id ?? ""),
			spaceId: subj.space_id != null ? String(subj.space_id) : undefined,
			url: subj.url ? String(subj.url) : undefined,
		},
		text: String(r.text ?? r.preview_text ?? ""),
	};
}
