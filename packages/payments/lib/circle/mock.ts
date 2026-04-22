/**
 * Mock Circle Service
 *
 * In-memory implementation of CircleService for development and testing.
 * Tracks provisioned members in a Map, supports idempotency-key dedup,
 * and logs all operations so the developer can see what would happen
 * against the real Circle API.
 *
 * @see Architecture/specs/S1-05-circle-provisioning.md
 */

import { logger } from "@repo/logs";
import type {
	CircleService,
	CreateMemberParams,
	CreateMemberResult,
	MemberTokenResult,
	ReactivateMemberParams,
} from "./types";
import { CircleApiError } from "./types";

interface MockMember {
	email: string;
	name: string;
	ssoUserId: string;
	status: "active" | "deactivated";
}

export class MockCircleService implements CircleService {
	private members = new Map<string, MockMember>();
	private idempotencyKeys = new Map<string, string>();
	private nextId = 90001;

	async createMember(params: CreateMemberParams): Promise<CreateMemberResult> {
		// Idempotency: return existing member if key was already used
		const existingId = this.idempotencyKeys.get(params.idempotencyKey);
		if (existingId) {
			logger.info("[MockCircle] Idempotent duplicate — returning existing member", {
				circleMemberId: existingId,
				idempotencyKey: params.idempotencyKey,
			});
			return { circleMemberId: existingId };
		}

		const circleMemberId = `mock-circle-${this.nextId++}`;
		this.members.set(circleMemberId, {
			email: params.email,
			name: params.name,
			ssoUserId: params.ssoUserId,
			status: "active",
		});
		this.idempotencyKeys.set(params.idempotencyKey, circleMemberId);

		logger.info("[MockCircle] Created member", {
			circleMemberId,
			email: params.email,
			name: params.name,
			ssoUserId: params.ssoUserId,
			spaceIds: params.spaceIds,
		});

		return { circleMemberId };
	}

	async deactivateMember(circleMemberId: string): Promise<void> {
		const member = this.members.get(circleMemberId);
		if (!member) {
			throw new CircleApiError(404, `Member ${circleMemberId} not found`);
		}
		if (member.status === "deactivated") {
			throw new CircleApiError(422, `Member ${circleMemberId} already deactivated`);
		}

		member.status = "deactivated";
		logger.info("[MockCircle] Deactivated member", {
			circleMemberId,
			email: member.email,
		});
	}

	async reactivateMember(params: ReactivateMemberParams): Promise<void> {
		// Find member by ssoUserId (re-provisioning with same SSO ID)
		const entry = [...this.members.entries()].find(
			([, m]) => m.ssoUserId === params.ssoUserId,
		);

		if (entry) {
			const [id, member] = entry;
			member.status = "active";
			logger.info("[MockCircle] Reactivated member", {
				circleMemberId: id,
				email: member.email,
			});
		} else {
			// Treat as new creation if member was hard-deleted
			const circleMemberId = `mock-circle-${this.nextId++}`;
			this.members.set(circleMemberId, {
				email: params.email,
				name: params.name,
				ssoUserId: params.ssoUserId,
				status: "active",
			});
			logger.info("[MockCircle] Reactivated (re-created) member", {
				circleMemberId,
				email: params.email,
			});
		}
	}

	async deleteMember(circleMemberId: string): Promise<void> {
		const member = this.members.get(circleMemberId);
		if (!member) {
			throw new CircleApiError(404, `Member ${circleMemberId} not found`);
		}

		this.members.delete(circleMemberId);
		logger.info("[MockCircle] Deleted member and all content", {
			circleMemberId,
			email: member.email,
		});
	}

	async getMemberToken(circleMemberId: string): Promise<MemberTokenResult> {
		logger.info("[MockCircle] Minted member token", { circleMemberId });
		return {
			accessToken: `mock-access-token-${circleMemberId}`,
			refreshToken: `mock-refresh-token-${circleMemberId}`,
		};
	}

	/** Test helper: get current member count */
	getMemberCount(): number {
		return this.members.size;
	}

	/** Test helper: get a member's current status */
	getMemberStatus(circleMemberId: string): string | undefined {
		return this.members.get(circleMemberId)?.status;
	}
}
