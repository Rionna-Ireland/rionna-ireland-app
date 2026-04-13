import { logger } from "@repo/logs";

/**
 * Placeholder for Circle member provisioning.
 * S1-05 will implement the actual Circle Admin API calls.
 *
 * @param member - The Member row with id, userId, organizationId
 * @param idempotencyKey - Stripe event ID used as Circle Idempotency-Key header
 */
export async function provisionCircleMember(
	member: { id: string; userId: string; organizationId: string },
	idempotencyKey: string,
): Promise<void> {
	logger.info("Circle provisioning placeholder called", {
		memberId: member.id,
		userId: member.userId,
		organizationId: member.organizationId,
		idempotencyKey,
	});
	// S1-05: Call Circle Admin API to create member
	// Update member.circleMemberId and member.circleStatus = "active"
}

/**
 * Placeholder for Circle member deactivation.
 * S1-05 will implement the actual Circle Admin API calls.
 *
 * @param member - The Member row with circleMemberId
 */
export async function deactivateCircleMember(
	member: { id: string; circleMemberId: string },
): Promise<void> {
	logger.info("Circle deactivation placeholder called", {
		memberId: member.id,
		circleMemberId: member.circleMemberId,
	});
	// S1-05: Call Circle Admin API to deactivate member
	// Update member.circleStatus = "deactivated"
}

/**
 * Placeholder for Circle member reactivation.
 * S1-05 will implement the actual Circle Admin API calls.
 *
 * @param member - The Member row with circleMemberId
 */
export async function reactivateCircleMember(
	member: { id: string; circleMemberId: string },
): Promise<void> {
	logger.info("Circle reactivation placeholder called", {
		memberId: member.id,
		circleMemberId: member.circleMemberId,
	});
	// S1-05: Call Circle Admin API to reactivate member
	// Update member.circleStatus = "active"
}

/**
 * Placeholder for Circle member deletion.
 * Called during user deletion cascade.
 * S1-05 will implement the actual Circle Admin API calls.
 *
 * @param circleMemberId - The Circle member ID to delete
 */
export async function deleteCircleMember(circleMemberId: string): Promise<void> {
	logger.info("Circle deletion placeholder called", {
		circleMemberId,
	});
	// S1-05: Call Circle Admin API to delete member
}
