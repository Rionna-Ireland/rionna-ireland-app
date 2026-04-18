import { z } from "zod";

import { protectedProcedure } from "../../../orpc/procedures";
import { verifyOrganizationMembership } from "../lib/membership";

export const verifyMembership = protectedProcedure
	.route({
		method: "GET",
		path: "/organizations/verify-membership",
		tags: ["Organizations"],
		summary: "Verify active user's membership in an organization",
	})
	.input(
		z.object({
			organizationId: z.string(),
		}),
	)
	.handler(async ({ context: { user }, input: { organizationId } }) => {
		const membership = await verifyOrganizationMembership(organizationId, user.id);

		return {
			isMember: Boolean(membership),
			role: membership?.role ?? null,
			organizationId,
		};
	});
