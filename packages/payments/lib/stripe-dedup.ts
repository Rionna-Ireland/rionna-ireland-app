import { db } from "@repo/database";

/**
 * Returns true if the event has already been processed.
 * Inserts the event ID atomically -- if the insert fails on unique
 * constraint, the event was already seen.
 */
export async function isEventDuplicate(eventId: string, eventType: string): Promise<boolean> {
	try {
		await db.stripeEventLog.create({
			data: { id: eventId, type: eventType },
		});
		return false; // First time seeing this event
	} catch (error: unknown) {
		if (
			error !== null &&
			error !== undefined &&
			typeof error === "object" &&
			"code" in error &&
			error.code === "P2002"
		) {
			return true; // Unique constraint violation — already processed
		}
		throw error; // Unexpected error — let it bubble
	}
}

export async function clearEventDedup(eventId: string): Promise<void> {
	await db.stripeEventLog.deleteMany({
		where: { id: eventId },
	});
}
