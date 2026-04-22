import { logger } from "@repo/logs";
import type {
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
}
