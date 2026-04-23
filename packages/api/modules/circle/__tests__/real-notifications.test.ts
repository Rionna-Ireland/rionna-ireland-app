/**
 * RealCircleService.getMemberNotifications tests
 *
 * Verifies the production Headless API implementation:
 * - Uses a member-scoped JWT minted via getMemberToken
 * - Calls GET /api/headless/v1/notifications with after_id / per_page
 * - Normalises Circle's wire JSON to our CircleNotification shape
 * - Returns CircleCallOutcome for all HTTP / network / token failures
 *
 * Part of S6-01 (T4).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@repo/logs", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
		log: vi.fn(),
	},
}));

// Mock the Headless SDK since the constructor instantiates it.
vi.mock("@circleco/headless-server-sdk", () => ({
	createClient: vi.fn(() => ({
		getMemberAPITokenFromCommunityMemberId: vi.fn(),
	})),
}));

import { RealCircleService } from "@repo/payments/lib/circle";

function makeService() {
	return new RealCircleService("admin-token", "headless-app-token");
}

function mockFetchJson(status: number, jsonBody: unknown) {
	const res = {
		ok: status >= 200 && status < 300,
		status,
		json: async () => jsonBody,
		text: async () => JSON.stringify(jsonBody),
	};
	return vi.fn().mockResolvedValueOnce(res);
}

describe("RealCircleService.getMemberNotifications", () => {
	let svc: RealCircleService;

	beforeEach(() => {
		svc = makeService();
		vi.stubGlobal("fetch", vi.fn());
		// Default: token mint succeeds.
		vi.spyOn(svc, "getMemberToken").mockResolvedValue({
			accessToken: "jwt-for-member",
			refreshToken: "refresh",
		});
	});

	afterEach(() => {
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("returns normalised page on 200 with records", async () => {
		vi.stubGlobal(
			"fetch",
			mockFetchJson(200, {
				records: [
					{
						id: 1001,
						notification_type: "post_mention",
						created_at: "2026-04-23T10:00:00Z",
						actor: { id: 7, name: "Alice" },
						subject: { type: "post", id: 55, space_id: 12, url: "https://c/p/55" },
						text: "Alice mentioned you",
					},
				],
				has_next_page: false,
			}),
		);

		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: null,
		});

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.data.items).toHaveLength(1);
		expect(outcome.data.items[0]).toMatchObject({
			id: "1001",
			type: "mention",
			createdAt: "2026-04-23T10:00:00Z",
			actor: { id: "7", name: "Alice" },
			subject: {
				kind: "post",
				id: "55",
				spaceId: "12",
				url: "https://c/p/55",
			},
			text: "Alice mentioned you",
		});
		expect(outcome.data.nextCursor).toBe("1001");
	});

	it("returns empty items + null cursor on 200 with no records", async () => {
		vi.stubGlobal("fetch", mockFetchJson(200, { records: [], has_next_page: false }));

		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: "99",
		});

		expect(outcome.ok).toBe(true);
		if (!outcome.ok) return;
		expect(outcome.data.items).toEqual([]);
		expect(outcome.data.nextCursor).toBeNull();
	});

	it("maps 401 to auth / retriable", async () => {
		vi.stubGlobal("fetch", mockFetchJson(401, { error: "unauthorized" }));
		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: null,
		});
		expect(outcome).toMatchObject({ ok: false, reason: "auth", retriable: true });
	});

	it("maps 403 to forbidden / not retriable", async () => {
		vi.stubGlobal("fetch", mockFetchJson(403, { error: "forbidden" }));
		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: null,
		});
		expect(outcome).toMatchObject({ ok: false, reason: "forbidden", retriable: false });
	});

	it("maps 404 to not_found / not retriable", async () => {
		vi.stubGlobal("fetch", mockFetchJson(404, {}));
		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: null,
		});
		expect(outcome).toMatchObject({ ok: false, reason: "not_found", retriable: false });
	});

	it("maps 422 to invalid_input / not retriable", async () => {
		vi.stubGlobal("fetch", mockFetchJson(422, {}));
		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: null,
		});
		expect(outcome).toMatchObject({ ok: false, reason: "invalid_input", retriable: false });
	});

	it("maps 429 to rate_limited / retriable", async () => {
		vi.stubGlobal("fetch", mockFetchJson(429, {}));
		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: null,
		});
		expect(outcome).toMatchObject({ ok: false, reason: "rate_limited", retriable: true });
	});

	it("maps 500 to server_error / retriable", async () => {
		vi.stubGlobal("fetch", mockFetchJson(500, {}));
		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: null,
		});
		expect(outcome).toMatchObject({ ok: false, reason: "server_error", retriable: true });
	});

	it("maps fetch network errors to network / retriable", async () => {
		vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("ECONNRESET")));
		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: null,
		});
		expect(outcome).toMatchObject({ ok: false, reason: "network", retriable: true });
	});

	it("propagates sinceNotificationId as after_id query param", async () => {
		const fetchMock = mockFetchJson(200, { records: [] });
		vi.stubGlobal("fetch", fetchMock);

		await svc.getMemberNotifications("42", { sinceNotificationId: "1234" });

		const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
		expect(calledUrl).toContain("after_id=1234");
	});

	it("defaults per_page to 50 when limit is omitted", async () => {
		const fetchMock = mockFetchJson(200, { records: [] });
		vi.stubGlobal("fetch", fetchMock);

		await svc.getMemberNotifications("42", { sinceNotificationId: null });

		const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
		expect(calledUrl).toContain("per_page=50");
	});

	it("honors custom limit", async () => {
		const fetchMock = mockFetchJson(200, { records: [] });
		vi.stubGlobal("fetch", fetchMock);

		await svc.getMemberNotifications("42", { sinceNotificationId: null, limit: 10 });

		const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
		expect(calledUrl).toContain("per_page=10");
	});

	it("returns auth outcome when getMemberToken throws; notifications fetch not called", async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal("fetch", fetchMock);
		vi.spyOn(svc, "getMemberToken").mockRejectedValueOnce(
			new Error("token mint failed"),
		);

		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: null,
		});

		expect(outcome).toMatchObject({ ok: false, reason: "auth", retriable: true });
		expect(fetchMock).not.toHaveBeenCalled();
	});

	it("sets nextCursor to last item id (oldest→newest assumption)", async () => {
		vi.stubGlobal(
			"fetch",
			mockFetchJson(200, {
				records: [
					{ id: 100, notification_type: "post_created", created_at: "t1", subject: { type: "post", id: 1 }, text: "" },
					{ id: 101, notification_type: "post_created", created_at: "t2", subject: { type: "post", id: 2 }, text: "" },
					{ id: 102, notification_type: "post_created", created_at: "t3", subject: { type: "post", id: 3 }, text: "" },
				],
			}),
		);

		const outcome = await svc.getMemberNotifications("42", {
			sinceNotificationId: null,
		});
		if (!outcome.ok) throw new Error("expected ok");
		expect(outcome.data.nextCursor).toBe("102");
		expect(outcome.data.items.map((i) => i.type)).toEqual(["post", "post", "post"]);
	});
});
