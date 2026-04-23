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
	CircleNotificationPage,
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

	const describeRecord = () => ({
		recordKeys: Object.keys(r).sort(),
		subjectKeys:
			r.subject && typeof r.subject === "object"
				? Object.keys(r.subject as Record<string, unknown>).sort()
				: [],
		actorKeys:
			r.actor && typeof r.actor === "object"
				? Object.keys(r.actor as Record<string, unknown>).sort()
				: [],
		candidateTypeFields: {
			notification_type: r.notification_type ?? null,
			type: r.type ?? null,
			event_type: r.event_type ?? null,
			kind: r.kind ?? null,
			action: r.action ?? null,
			name: r.name ?? null,
		},
		candidateTextFields: {
			text: r.text ?? null,
			preview_text: r.preview_text ?? null,
			body: r.body ?? null,
			message: r.message ?? null,
			title: r.title ?? null,
		},
		subjectPreview:
			r.subject && typeof r.subject === "object"
				? {
						type: (r.subject as Record<string, unknown>).type ?? null,
						kind: (r.subject as Record<string, unknown>).kind ?? null,
						id: (r.subject as Record<string, unknown>).id ?? null,
						space_id: (r.subject as Record<string, unknown>).space_id ?? null,
						spaceId: (r.subject as Record<string, unknown>).spaceId ?? null,
						url: (r.subject as Record<string, unknown>).url ?? null,
					}
				: null,
	});

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
			...describeRecord(),
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
			...describeRecord(),
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

/**
 * Belt-and-braces cursor guard for notifications pages.
 *
 * The Headless API is expected to honor `sinceNotificationId`/`after_id`, but
 * live rollout has already shown replay symptoms. We therefore apply the
 * cursor locally as well: any record whose id is <= the current cursor is
 * filtered out, and an all-stale page preserves the existing cursor instead of
 * rewinding it.
 */
export function applyNotificationsCursor(
	items: CircleNotification[],
	sinceNotificationId: string | null,
): CircleNotificationPage {
	const sortedItems = [...items].sort((a, b) => compareIds(a.id, b.id));
	const filteredItems = sinceNotificationId
		? sortedItems.filter((item) => compareIds(item.id, sinceNotificationId) > 0)
		: sortedItems;

	if (
		sinceNotificationId !== null
		&& filteredItems.length !== sortedItems.length
	) {
		logger.warn("[CircleNotifications] Filtered stale/replayed notifications locally", {
			sinceNotificationId,
			returnedCount: sortedItems.length,
			filteredCount: filteredItems.length,
			highestReturnedId:
				sortedItems.length > 0
					? sortedItems[sortedItems.length - 1]!.id
					: null,
		});
	}

	return {
		items: filteredItems,
		nextCursor:
			filteredItems.length > 0
				? filteredItems[filteredItems.length - 1]!.id
				: sortedItems.length > 0
					? sinceNotificationId
					: null,
	};
}
