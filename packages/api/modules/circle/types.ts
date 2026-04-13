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

export interface CircleService {
	createMember(params: CreateMemberParams): Promise<CreateMemberResult>;
	deactivateMember(circleMemberId: string): Promise<void>;
	reactivateMember(params: ReactivateMemberParams): Promise<void>;
	deleteMember(circleMemberId: string): Promise<void>;
	getMemberToken(ssoUserId: string): Promise<MemberTokenResult>;
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
