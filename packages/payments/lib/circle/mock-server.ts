import { logger } from "@repo/logs";
import {
	classifyStatus,
	compareIds,
	normaliseCircleNotification,
} from "./real";
import type {
	CircleCallOutcome,
	CircleNotification,
	CircleNotificationPage,
	CircleService,
	CreateMemberParams,
	CreateMemberResult,
	MemberTokenResult,
	ReactivateMemberParams,
} from "./types";
import { CircleApiError } from "./types";

type MockServerCircleServiceOptions = {
	baseUrl: string;
	adminToken: string;
	appToken: string;
};

export class MockServerCircleService implements CircleService {
	private readonly baseUrl: string;
	private readonly adminToken: string;
	private readonly appToken: string;

	constructor(options: MockServerCircleServiceOptions) {
		this.baseUrl = options.baseUrl.replace(/\/+$/, "");
		this.adminToken = options.adminToken;
		this.appToken = options.appToken;
	}

	private async parseJson<T>(response: Response): Promise<T> {
		return (await response.json()) as T;
	}

	private async readError(response: Response, fallback: string) {
		try {
			const body = await response.text();
			return body || fallback;
		} catch {
			return fallback;
		}
	}

	async createMember(params: CreateMemberParams): Promise<CreateMemberResult> {
		const response = await fetch(`${this.baseUrl}/api/admin/v2/community_members`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.adminToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				email: params.email,
				name: params.name,
				sso_user_id: params.ssoUserId,
				space_ids: params.spaceIds ?? [],
				idempotency_key: params.idempotencyKey,
			}),
		});

		if (!response.ok) {
			throw new CircleApiError(
				response.status,
				await this.readError(response, "Mock server create member failed"),
			);
		}

		const data = await this.parseJson<{ id: number | string }>(response);
		return { circleMemberId: String(data.id) };
	}

	async deactivateMember(circleMemberId: string): Promise<void> {
		const response = await fetch(`${this.baseUrl}/api/admin/v2/community_members/${circleMemberId}`, {
			method: "DELETE",
			headers: {
				Authorization: `Bearer ${this.adminToken}`,
			},
		});

		if (!response.ok && response.status !== 404) {
			throw new CircleApiError(
				response.status,
				await this.readError(response, "Mock server deactivate member failed"),
			);
		}
	}

	async reactivateMember(params: ReactivateMemberParams): Promise<void> {
		const tokenResponse = await fetch(`${this.baseUrl}/api/v1/headless/auth_token`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.appToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				sso_user_id: params.ssoUserId,
				email: params.email,
			}),
		});

		if (tokenResponse.status === 404) {
			await this.createMember({
				...params,
				idempotencyKey: params.idempotencyKey,
			});
			return;
		}

		if (!tokenResponse.ok) {
			throw new CircleApiError(
				tokenResponse.status,
				await this.readError(tokenResponse, "Mock server lookup during reactivation failed"),
			);
		}

		const data = await this.parseJson<{ community_member_id: number | string }>(tokenResponse);
		const updateResponse = await fetch(
			`${this.baseUrl}/api/admin/v2/community_members/${data.community_member_id}`,
			{
				method: "PUT",
				headers: {
					Authorization: `Bearer ${this.adminToken}`,
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					status: "active",
					email: params.email,
					name: params.name,
				}),
			},
		);

		if (!updateResponse.ok) {
			throw new CircleApiError(
				updateResponse.status,
				await this.readError(updateResponse, "Mock server reactivate member failed"),
			);
		}
	}

	async deleteMember(circleMemberId: string): Promise<void> {
		const response = await fetch(
			`${this.baseUrl}/api/admin/v2/community_members/${circleMemberId}/delete_member`,
			{
				method: "PUT",
				headers: {
					Authorization: `Bearer ${this.adminToken}`,
				},
			},
		);

		if (!response.ok && response.status !== 404) {
			throw new CircleApiError(
				response.status,
				await this.readError(response, "Mock server delete member failed"),
			);
		}
	}

	async getMemberToken(circleMemberId: string): Promise<MemberTokenResult> {
		const response = await fetch(`${this.baseUrl}/api/v1/headless/auth_token`, {
			method: "POST",
			headers: {
				Authorization: `Bearer ${this.appToken}`,
				"Content-Type": "application/json",
			},
			body: JSON.stringify({
				community_member_id: Number(circleMemberId),
			}),
		});

		if (!response.ok) {
			throw new CircleApiError(
				response.status,
				await this.readError(response, "Mock server get member token failed"),
			);
		}

		const data = await this.parseJson<{
			access_token: string;
			refresh_token: string;
			community_member_id: number | string;
		}>(response);

		logger.info("[Circle] Minted member token from circle-mock", {
			circleMemberId,
			communityMemberId: data.community_member_id,
		});

		return {
			accessToken: data.access_token,
			refreshToken: data.refresh_token,
		};
	}

	/**
	 * Fetch a member's notifications from circle-mock's Headless proxy.
	 *
	 * Mirrors `RealCircleService.getMemberNotifications` (same helpers, same
	 * CircleCallOutcome shape) so behavior stays consistent across modes.
	 * T6 will extend circle-mock to serve scripted notification pages at
	 * `/api/headless/v1/notifications` in the same `{ records, has_next_page }`
	 * shape Circle uses.
	 */
	async getMemberNotifications(
		circleMemberId: string,
		opts: { sinceNotificationId: string | null; limit?: number },
	): Promise<CircleCallOutcome<CircleNotificationPage>> {
		// Mint a member-scoped JWT via the existing mock-server token endpoint.
		// getMemberToken throws on failure — wrap into an outcome to keep parity
		// with RealCircleService. T7 will refactor getMemberToken to return an
		// outcome directly; until then, default to server_error/retriable so
		// transient mock-server hiccups don't poison the poller.
		let accessToken: string;
		try {
			const token = await this.getMemberToken(circleMemberId);
			accessToken = token.accessToken;
		} catch (err) {
			logger.error(
				"[MockServerCircle] getMemberToken failed for notifications poll",
				{
					circleMemberId,
					error: err instanceof Error ? err.message : String(err),
				},
			);
			return { ok: false, reason: "server_error", retriable: true, raw: err };
		}

		const url = new URL(`${this.baseUrl}/api/headless/v1/notifications`);
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
			logger.warn("[MockServerCircle] Notifications fetch failed (network)", {
				circleMemberId,
				error: err instanceof Error ? err.message : String(err),
			});
			return { ok: false, reason: "network", retriable: true, raw: err };
		}

		if (!res.ok) {
			const raw = await res.text().catch(() => undefined);
			const { reason, retriable } = classifyStatus(res.status);
			logger.warn("[MockServerCircle] Notifications fetch non-2xx", {
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
			logger.warn("[MockServerCircle] Notifications response not JSON", {
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

		const sortedItems = [...items].sort((a, b) => compareIds(a.id, b.id));
		if (items.some((n, i) => n.id !== sortedItems[i]!.id)) {
			logger.warn(
				"[MockServerCircle] Notifications returned out of order; sorted defensively",
				{ count: items.length },
			);
		}
		const nextCursor =
			sortedItems.length > 0 ? sortedItems[sortedItems.length - 1]!.id : null;

		return { ok: true, data: { items: sortedItems, nextCursor } };
	}
}
