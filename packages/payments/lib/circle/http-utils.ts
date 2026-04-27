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
	const notifiable = (r.notifiable ?? r.subject ?? {}) as Record<string, unknown>;
	const rawAction = String(r.action ?? "");
	const rawType = String(r.notification_type ?? r.type ?? rawAction ?? "");
	const rawNotifiableType = String(r.notifiable_type ?? "");
	const normalizedNotifiableType = rawNotifiableType.toLowerCase();

	const knownActionMap: Record<string, CircleNotificationType> = {
		mention: "mention",
		comment: "comment",
		like: "reaction",
		rsvp: "event_reminder",
		message: "dm",
		dm: "dm",
		direct_message: "dm",
		new_message: "dm",
		send_message: "dm",
		sent_message: "dm",
		chat_message: "dm",
		chat_room_message: "dm",
	};

	const knownSubjectKinds: Record<string, CircleNotificationSubject["kind"]> = {
		post: "post",
		comment: "comment",
		dm: "dm",
		chat: "dm",
		chatroom: "dm",
		chat_room: "dm",
		chatroommessage: "dm",
		chat_room_message: "dm",
		chatthread: "dm",
		chat_thread: "dm",
		event: "event",
		member: "member",
		conversation: "dm",
		message: "dm",
	};

	const rawSubjectKind = String(
		notifiable.type
			?? notifiable.kind
			?? rawNotifiableType
			?? "",
	).toLowerCase();
	const subjectKind: CircleNotificationSubject["kind"] =
		knownSubjectKinds[rawSubjectKind] ?? "post";

	let type: CircleNotificationType | null =
		typeMap[rawType] ?? knownActionMap[rawAction] ?? null;

	if (type === null) {
		if (rawAction === "add") {
			type =
				subjectKind === "comment"
					? "comment"
					: subjectKind === "dm"
						? "dm"
						: "post";
		} else if (subjectKind === "dm") {
			type = "dm";
		} else if (subjectKind === "event") {
			type = "event_reminder";
		} else if (subjectKind === "member") {
			type = "admin_event";
		} else {
			type = "post";
			logger.warn("[RealCircle] Unknown notification type; falling back to 'post'", {
				rawType,
				rawAction,
				rawNotifiableType,
				notificationId: String(r.id),
				recordKeys: Object.keys(r).sort(),
			});
		}
	}

	if (!knownSubjectKinds[rawSubjectKind]) {
		logger.warn("[RealCircle] Unknown subject kind; defaulting to 'post'", {
			rawKind: rawSubjectKind || "(none)",
			rawNotifiableType,
			notificationId: String(r.id ?? "(unknown)"),
		});
	}

	const actor = r.actor as { id?: unknown; name?: unknown } | null | undefined;
	const actorName = String(
		actor?.name
			?? r.actor_name
			?? r.second_actor_name
			?? "",
	).trim();
	const actorId = String(
		actor?.id
			?? r.actor_id
			?? actorName,
	).trim();

	const text = String(
		r.text
			?? r.preview_text
			?? r.notifiable_title
			?? r.display_action
			?? "",
	).trim();
	const subjectTitle = String(
		notifiable.title
			?? r.notifiable_title
			?? "",
	).trim();
	const spaceTitle = String(r.space_title ?? "").trim();
	const displayAction = String(r.display_action ?? "").trim();

	return {
		id: String(r.id),
		type,
		createdAt: String(r.created_at ?? r.createdAt ?? ""),
		actor:
			actorId && actorName
				? { id: actorId, name: actorName }
				: null,
		subject: {
			kind: subjectKind,
			id: String(notifiable.id ?? notifiable.uuid ?? r.notifiable_id ?? r.uuid ?? ""),
			spaceId:
				notifiable.space_id != null
					? String(notifiable.space_id)
					: r.space_id != null
						? String(r.space_id)
						: undefined,
			title: subjectTitle || undefined,
			url: String(notifiable.url ?? r.action_web_url ?? "").trim() || undefined,
		},
		spaceTitle: spaceTitle || undefined,
		displayAction: displayAction || undefined,
		text,
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
