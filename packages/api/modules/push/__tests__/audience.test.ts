/**
 * S2-04: Push audience targeting tests
 *
 * Tests the getAudienceTokens logic:
 * - Users with pushEnabled: false receive no pushes
 * - Users with specific preference disabled are excluded for that trigger type
 * - SYSTEM pushes go to everyone with pushEnabled
 * - getPrefKey maps trigger types correctly
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock @repo/database
const mockFindMany = vi.fn();

vi.mock("@repo/database", () => ({
	db: {
		pushToken: { findMany: (...args: unknown[]) => mockFindMany(...args) },
	},
}));

import { getAudienceTokens, getPrefKey } from "../audience";

describe("getPrefKey", () => {
	it("maps HORSE_DECLARED to horseDeclared", () => {
		expect(getPrefKey("HORSE_DECLARED")).toBe("horseDeclared");
	});

	it("maps HORSE_NON_RUNNER to horseDeclared", () => {
		expect(getPrefKey("HORSE_NON_RUNNER")).toBe("horseDeclared");
	});

	it("maps RACE_RESULT to raceResult", () => {
		expect(getPrefKey("RACE_RESULT")).toBe("raceResult");
	});

	it("maps TRAINER_POST to trainerPost", () => {
		expect(getPrefKey("TRAINER_POST")).toBe("trainerPost");
	});

	it("maps NEWS_POST to newsPost", () => {
		expect(getPrefKey("NEWS_POST")).toBe("newsPost");
	});

	it("maps SYSTEM to null (all users)", () => {
		expect(getPrefKey("SYSTEM")).toBeNull();
	});
});

describe("getAudienceTokens", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("returns tokens for users with pushEnabled and default preferences", async () => {
		mockFindMany.mockResolvedValue([
			{
				expoPushToken: "ExponentPushToken[abc]",
				userId: "user-1",
				user: { pushPreferences: {} },
			},
			{
				expoPushToken: "ExponentPushToken[def]",
				userId: "user-2",
				user: { pushPreferences: {} },
			},
		]);

		const tokens = await getAudienceTokens({
			organizationId: "org-1",
			triggerType: "HORSE_DECLARED",
		});

		expect(tokens).toEqual([
			{ expoPushToken: "ExponentPushToken[abc]", userId: "user-1" },
			{ expoPushToken: "ExponentPushToken[def]", userId: "user-2" },
		]);
	});

	it("excludes users with specific preference disabled", async () => {
		mockFindMany.mockResolvedValue([
			{
				expoPushToken: "ExponentPushToken[abc]",
				userId: "user-1",
				user: { pushPreferences: { horseDeclared: false } },
			},
			{
				expoPushToken: "ExponentPushToken[def]",
				userId: "user-2",
				user: { pushPreferences: { horseDeclared: true } },
			},
		]);

		const tokens = await getAudienceTokens({
			organizationId: "org-1",
			triggerType: "HORSE_DECLARED",
		});

		expect(tokens).toEqual([
			{ expoPushToken: "ExponentPushToken[def]", userId: "user-2" },
		]);
	});

	it("excludes users with newsPost preference disabled for NEWS_POST trigger", async () => {
		mockFindMany.mockResolvedValue([
			{
				expoPushToken: "ExponentPushToken[abc]",
				userId: "user-1",
				user: { pushPreferences: { newsPost: false } },
			},
		]);

		const tokens = await getAudienceTokens({
			organizationId: "org-1",
			triggerType: "NEWS_POST",
		});

		expect(tokens).toEqual([]);
	});

	it("sends SYSTEM pushes to everyone (ignores preferences)", async () => {
		mockFindMany.mockResolvedValue([
			{
				expoPushToken: "ExponentPushToken[abc]",
				userId: "user-1",
				user: { pushPreferences: { horseDeclared: false, newsPost: false } },
			},
			{
				expoPushToken: "ExponentPushToken[def]",
				userId: "user-2",
				user: { pushPreferences: {} },
			},
		]);

		const tokens = await getAudienceTokens({
			organizationId: "org-1",
			triggerType: "SYSTEM",
		});

		expect(tokens).toHaveLength(2);
	});

	it("returns empty array when no tokens match", async () => {
		mockFindMany.mockResolvedValue([]);

		const tokens = await getAudienceTokens({
			organizationId: "org-1",
			triggerType: "RACE_RESULT",
		});

		expect(tokens).toEqual([]);
	});

	it("treats null pushPreferences as all-enabled (opt-out model)", async () => {
		mockFindMany.mockResolvedValue([
			{
				expoPushToken: "ExponentPushToken[abc]",
				userId: "user-1",
				user: { pushPreferences: null },
			},
		]);

		const tokens = await getAudienceTokens({
			organizationId: "org-1",
			triggerType: "TRAINER_POST",
		});

		expect(tokens).toHaveLength(1);
	});

	it("passes pushEnabled and org membership filters to DB query", async () => {
		mockFindMany.mockResolvedValue([]);

		await getAudienceTokens({
			organizationId: "org-1",
			triggerType: "RACE_RESULT",
		});

		expect(mockFindMany).toHaveBeenCalledWith({
			where: {
				user: {
					pushEnabled: true,
					members: {
						some: { organizationId: "org-1" },
					},
				},
			},
			select: {
				expoPushToken: true,
				userId: true,
				user: { select: { pushPreferences: true } },
			},
		});
	});

	it("scopes to targetUserId when provided", async () => {
		mockFindMany.mockResolvedValue([]);

		await getAudienceTokens({
			organizationId: "org-1",
			triggerType: "SYSTEM",
			targetUserId: "user-99",
		});

		expect(mockFindMany).toHaveBeenCalledWith({
			where: {
				user: {
					pushEnabled: true,
					members: {
						some: { organizationId: "org-1" },
					},
					id: "user-99",
				},
			},
			select: {
				expoPushToken: true,
				userId: true,
				user: { select: { pushPreferences: true } },
			},
		});
	});
});
