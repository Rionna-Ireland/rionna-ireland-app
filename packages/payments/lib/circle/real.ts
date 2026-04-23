/**
 * Real Circle Service
 *
 * Production implementation that calls Circle.so Admin API v2 (fetch)
 * and Headless Auth SDK (@circleco/headless-server-sdk) for token minting.
 *
 * @see Architecture/specs/S1-05-circle-provisioning.md
 */

import { createClient } from "@circleco/headless-server-sdk";
import { logger } from "@repo/logs";
import type {
	CircleCallFailure,
	CircleCallOutcome,
	CircleNotification,
	CircleNotificationPage,
	CircleNotificationSubject,
	CircleNotificationType,
	CircleService,
	CreateMemberParams,
	CreateMemberResult,
	MemberTokenResult,
	ReactivateMemberParams,
} from "./types";
import { CircleApiError } from "./types";

const CIRCLE_ADMIN_BASE = "https://app.circle.so/api/admin/v2";
const CIRCLE_HEADLESS_BASE = "https://app.circle.so/api/headless/v1";

/**
 * Map an HTTP status to a CircleCallFailure and retriable flag.
 *
 * Module-scope so T7 can reuse when refactoring the other
 * RealCircleService methods to return CircleCallOutcome.
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
function compareIds(a: string, b: string): number {
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
 * Circle's exact notification_type values aren't fully documented from our
 * side; the table below captures our best-guess mappings from public docs
 * and web UI spelunking. Unknown types fall back to "post" and are logged
 * so T18 manual QA can surface the actual strings Circle emits.
 *
 * Returns null when the record is missing an `id` — such records would
 * corrupt the cursor (`id: "undefined"` becomes the next `after_id`), so
 * they must be dropped rather than normalised.
 */
function normaliseCircleNotification(record: unknown): CircleNotification | null {
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

export class RealCircleService implements CircleService {
	private adminToken: string;
	private headlessClient: ReturnType<typeof createClient>;

	constructor(adminToken: string, headlessAuthToken: string) {
		this.adminToken = adminToken;
		this.headlessClient = createClient({ appToken: headlessAuthToken });
	}

	async createMember(params: CreateMemberParams): Promise<CreateMemberResult> {
		const response = await fetch(`${CIRCLE_ADMIN_BASE}/community_members`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.adminToken}`,
				"Content-Type": "application/json",
				"Idempotency-Key": params.idempotencyKey,
			},
			body: JSON.stringify({
				email: params.email,
				name: params.name,
				skip_invitation: true,
				space_ids: params.spaceIds ?? [],
			}),
		});

		if (!response.ok) {
			const body = await response.text();
			logger.error("[Circle] Create member failed", {
				status: response.status,
				body,
				email: params.email,
			});
			throw new CircleApiError(response.status, `Circle create member failed: ${response.status} ${body}`);
		}

		const data = (await response.json()) as {
			id?: number;
			community_member?: { id: number };
		};
		const id = data.community_member?.id ?? data.id;
		if (id === undefined) {
			const body = JSON.stringify(data).slice(0, 500);
			logger.error("[Circle] Create member: id missing from response", {
				body,
				email: params.email,
			});
			throw new CircleApiError(
				response.status,
				`Circle create member: id missing from response body`,
			);
		}
		const circleMemberId = String(id);

		logger.info("[Circle] Created member", {
			circleMemberId,
			email: params.email,
		});

		return { circleMemberId };
	}

	async deactivateMember(circleMemberId: string): Promise<void> {
		const response = await fetch(
			`${CIRCLE_ADMIN_BASE}/community_members/${circleMemberId}`,
			{
				method: "DELETE",
				headers: {
					Authorization: `Bearer ${this.adminToken}`,
				},
			},
		);

		// 404 = already gone, treat as success
		if (!response.ok && response.status !== 404) {
			const body = await response.text();
			logger.error("[Circle] Deactivate member failed", {
				status: response.status,
				body,
				circleMemberId,
			});
			throw new CircleApiError(response.status, `Circle deactivate failed: ${response.status} ${body}`);
		}

		logger.info("[Circle] Deactivated member", { circleMemberId });
	}

	async reactivateMember(params: ReactivateMemberParams): Promise<void> {
		// Circle doesn't have a dedicated reactivate endpoint.
		// Re-provision with the same SSO ID — Circle matches the existing member.
		const response = await fetch(`${CIRCLE_ADMIN_BASE}/community_members`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.adminToken}`,
				"Content-Type": "application/json",
				"Idempotency-Key": params.idempotencyKey,
			},
			body: JSON.stringify({
				email: params.email,
				name: params.name,
				skip_invitation: true,
			}),
		});

		if (!response.ok) {
			const body = await response.text();
			logger.error("[Circle] Reactivate member failed", {
				status: response.status,
				body,
				email: params.email,
			});
			throw new CircleApiError(response.status, `Circle reactivate failed: ${response.status} ${body}`);
		}

		logger.info("[Circle] Reactivated member", { email: params.email });
	}

	async deleteMember(circleMemberId: string): Promise<void> {
		const response = await fetch(
			`${CIRCLE_ADMIN_BASE}/community_members/${circleMemberId}/delete_member`,
			{
				method: "PUT",
				headers: {
					Authorization: `Bearer ${this.adminToken}`,
				},
			},
		);

		// 404 = already gone, treat as success
		if (!response.ok && response.status !== 404) {
			const body = await response.text();
			logger.error("[Circle] Delete member failed", {
				status: response.status,
				body,
				circleMemberId,
			});
			throw new CircleApiError(response.status, `Circle delete failed: ${response.status} ${body}`);
		}

		logger.info("[Circle] Deleted member", { circleMemberId });
	}

	async getMemberToken(circleMemberId: string): Promise<MemberTokenResult> {
		const result = await this.headlessClient.getMemberAPITokenFromCommunityMemberId(
			Number(circleMemberId),
		);

		logger.info("[Circle] Minted member token", { circleMemberId });

		return {
			accessToken: result.access_token,
			refreshToken: result.refresh_token,
		};
	}

	/**
	 * Fetch a member's notifications from the Circle Headless API.
	 *
	 * Unlike the older methods on this class (which throw CircleApiError),
	 * this returns a CircleCallOutcome so the poller can distinguish retriable
	 * from terminal failures without a try/catch dance. T7 will migrate the
	 * other methods to the same shape.
	 */
	async getMemberNotifications(
		circleMemberId: string,
		opts: { sinceNotificationId: string | null; limit?: number },
	): Promise<CircleCallOutcome<CircleNotificationPage>> {
		// Mint (or reuse via SDK) the member-scoped JWT.
		// getMemberToken today throws on failure — wrap into an outcome.
		// (T7 will refactor getMemberToken itself to return CircleCallOutcome.)
		let accessToken: string;
		try {
			const token = await this.getMemberToken(circleMemberId);
			accessToken = token.accessToken;
		} catch (err) {
			logger.error("[Circle] getMemberToken failed for notifications poll", {
				circleMemberId,
				error: err instanceof Error ? err.message : String(err),
			});
			// TODO(T7): getMemberToken refactor will let us classify token-mint failures properly (auth vs network vs rate-limited). Until then, default to server_error so transient failures retry without firing misleading auth alerts.
			return { ok: false, reason: "server_error", retriable: true, raw: err };
		}

		const url = new URL(`${CIRCLE_HEADLESS_BASE}/notifications`);
		// TODO(T18): verify Circle Headless accepts `after_id` + `per_page` as the
		// pagination param names. If not, the poller will silently re-fetch the
		// full first page every tick. Alternatives to try: since_id, starting_after, limit, page_size.
		if (opts.sinceNotificationId) {
			url.searchParams.set("after_id", opts.sinceNotificationId);
		}
		url.searchParams.set("per_page", String(opts.limit ?? 50));

		let res: Response;
		try {
			res = await fetch(url, {
				headers: {
					Authorization: `Bearer ${accessToken}`,
					"Content-Type": "application/json",
				},
			});
		} catch (err) {
			logger.warn("[Circle] Notifications fetch failed (network)", {
				circleMemberId,
				error: err instanceof Error ? err.message : String(err),
			});
			return { ok: false, reason: "network", retriable: true, raw: err };
		}

		if (!res.ok) {
			const raw = await res.text().catch(() => undefined);
			const { reason, retriable } = classifyStatus(res.status);
			logger.warn("[Circle] Notifications fetch non-2xx", {
				circleMemberId,
				status: res.status,
				reason,
			});
			return { ok: false, reason, retriable, raw };
		}

		let body: unknown;
		try {
			body = await res.json();
		} catch (err) {
			logger.warn("[Circle] Notifications response not JSON", {
				circleMemberId,
				error: err instanceof Error ? err.message : String(err),
			});
			return { ok: false, reason: "server_error", retriable: true, raw: err };
		}

		const records = (body as { records?: unknown })?.records;
		const items = Array.isArray(records)
			? records
					.map(normaliseCircleNotification)
					.filter((n): n is CircleNotification => n !== null)
			: [];

		// T2 contract: items oldest→newest with monotonically orderable ids.
		// Defensively sort to protect against Circle returning newest→oldest.
		const sortedItems = [...items].sort((a, b) => compareIds(a.id, b.id));
		if (items.some((n, i) => n.id !== sortedItems[i]!.id)) {
			logger.warn("[RealCircle] Notifications returned out of order; sorted defensively", {
				count: items.length,
			});
		}
		const nextCursor =
			sortedItems.length > 0 ? sortedItems[sortedItems.length - 1]!.id : null;

		return { ok: true, data: { items: sortedItems, nextCursor } };
	}
}
