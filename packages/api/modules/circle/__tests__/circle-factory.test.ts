/**
 * Circle Service Factory tests
 *
 * Verifies the factory returns MockCircleService when env vars are
 * absent and RealCircleService when they are present.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@repo/logs", () => ({
	logger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		log: vi.fn(),
	},
}));

describe("createCircleService", () => {
	const originalEnv = process.env;

	beforeEach(() => {
		vi.resetModules();
		process.env = { ...originalEnv };
	});

	afterEach(() => {
		process.env = originalEnv;
	});

	it("returns MockCircleService when env vars are absent", async () => {
		delete process.env.CIRCLE_APP_TOKEN_PINK_CONNECTIONS;
		delete process.env.CIRCLE_HEADLESS_AUTH_TOKEN_PINK_CONNECTIONS;

		const { createCircleService, MockCircleService } = await import("@repo/payments/lib/circle");

		const service = createCircleService("pink-connections");
		expect(service).toBeInstanceOf(MockCircleService);
	});

	it("returns RealCircleService when env vars are present", async () => {
		process.env.CIRCLE_APP_TOKEN_PINK_CONNECTIONS = "test-admin-token";
		process.env.CIRCLE_HEADLESS_AUTH_TOKEN_PINK_CONNECTIONS = "test-headless-token";

		const { createCircleService, RealCircleService } = await import("@repo/payments/lib/circle");

		const service = createCircleService("pink-connections");
		expect(service).toBeInstanceOf(RealCircleService);
	});

	it("normalizes org slug correctly (hyphens to underscores, uppercase)", async () => {
		process.env.CIRCLE_APP_TOKEN_MY_RACING_CLUB = "token-a";
		process.env.CIRCLE_HEADLESS_AUTH_TOKEN_MY_RACING_CLUB = "token-b";

		const { createCircleService, RealCircleService } = await import("@repo/payments/lib/circle");

		const service = createCircleService("my-racing-club");
		expect(service).toBeInstanceOf(RealCircleService);
	});
});
