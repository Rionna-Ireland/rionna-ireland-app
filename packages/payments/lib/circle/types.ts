/**
 * Circle Service Interface
 *
 * Abstracts Circle.so Admin API v2 and Headless Auth SDK behind a
 * swappable interface. The factory in index.ts returns either a
 * MockCircleService (dev) or RealCircleService (production) based
 * on whether Circle env vars are present.
 *
 * @see Architecture/specs/S1-05-circle-provisioning.md
 */

export interface CreateMemberParams {
	email: string;
	name: string;
	ssoUserId: string;
	spaceIds?: string[];
	idempotencyKey: string;
}

export interface CreateMemberResult {
	circleMemberId: string;
}

export interface ReactivateMemberParams {
	email: string;
	name: string;
	ssoUserId: string;
	idempotencyKey: string;
}

export interface MemberTokenResult {
	accessToken: string;
	refreshToken: string;
}

export type CircleNotificationType =
	| "post"
	| "comment"
	| "mention"
	| "reaction"
	| "dm"
	| "event_reminder"
	| "admin_event";

export type CircleNotification = {
	/** Circle's notification id — used as cursor unit. */
	id: string;
	type: CircleNotificationType;
	/** ISO-8601. */
	createdAt: string;
	actor: { id: string; name: string } | null;
	subject: {
		kind: "post" | "comment" | "dm" | "event" | "member";
		id: string;
		spaceId?: string;
		/** Circle-side URL for deep-linking into the WebView. */
		url?: string;
	};
	/** Short preview used as push body. */
	text: string;
};

export type CircleNotificationPage = {
	/** Oldest → newest within the page. */
	items: CircleNotification[];
	/** Highest id in this page, or null if empty (callers should fall through to the prior cursor). */
	nextCursor: string | null;
};

export type CircleCallFailure =
	| "network"
	| "auth"
	| "rate_limited"
	| "not_found"
	| "server_error"
	| "forbidden"
	| "invalid_input";

export type CircleCallOutcome<T> =
	| { ok: true; data: T }
	| { ok: false; reason: CircleCallFailure; retriable: boolean; raw?: unknown };

export interface CircleService {
	createMember(params: CreateMemberParams): Promise<CreateMemberResult>;
	deactivateMember(circleMemberId: string): Promise<void>;
	reactivateMember(params: ReactivateMemberParams): Promise<void>;
	deleteMember(circleMemberId: string): Promise<void>;
	getMemberToken(circleMemberId: string): Promise<MemberTokenResult>;
	getMemberNotifications(
		circleMemberId: string,
		opts: { sinceNotificationId: string | null; limit?: number },
	): Promise<CircleCallOutcome<CircleNotificationPage>>;
}

export class CircleApiError extends Error {
	constructor(
		public readonly statusCode: number,
		message: string,
	) {
		super(message);
		this.name = "CircleApiError";
	}
}
