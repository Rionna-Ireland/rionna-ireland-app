/**
 * Circle Service factory
 *
 * Returns the correct CircleService implementation based on whether
 * Circle env vars are present. Falls back to MockCircleService
 * automatically during development.
 *
 * Env var naming convention (per D15):
 *   CIRCLE_APP_TOKEN_{ORG_SLUG}          — Admin API v2 token
 *   CIRCLE_HEADLESS_AUTH_TOKEN_{ORG_SLUG} — Headless Auth token
 *
 * @see Architecture/specs/S1-05-circle-provisioning.md
 */

import { logger } from "@repo/logs";
import { MockCircleService } from "./mock";
import { RealCircleService } from "./real";
import type { CircleService } from "./types";

function normalizeOrgSlug(slug: string): string {
	return slug.toUpperCase().replace(/-/g, "_");
}

export function createCircleService(orgSlug: string): CircleService {
	const key = normalizeOrgSlug(orgSlug);
	const adminToken = process.env[`CIRCLE_APP_TOKEN_${key}`];
	const headlessToken = process.env[`CIRCLE_HEADLESS_AUTH_TOKEN_${key}`];

	if (!adminToken || !headlessToken) {
		logger.warn(`[Circle] No tokens found for org "${orgSlug}" — using MockCircleService`);
		return new MockCircleService();
	}

	return new RealCircleService(adminToken, headlessToken);
}

export type { CircleService } from "./types";
export type {
	CreateMemberParams,
	CreateMemberResult,
	MemberTokenResult,
	ReactivateMemberParams,
} from "./types";
export { CircleApiError } from "./types";
export { MockCircleService } from "./mock";
export { RealCircleService } from "./real";
