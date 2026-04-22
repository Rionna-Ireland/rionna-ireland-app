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
	CircleService,
	CreateMemberParams,
	CreateMemberResult,
	MemberTokenResult,
	ReactivateMemberParams,
} from "./types";
import { CircleApiError } from "./types";

const CIRCLE_ADMIN_BASE = "https://app.circle.so/api/admin/v2";

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
}
