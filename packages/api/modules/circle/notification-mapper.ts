import type { CircleNotification } from "@repo/payments/lib/circle/types";

/**
 * Output shape the poller hands to sendPush.
 * Literal-string triggerType/prefKey become members of typed enums in T10.
 */
export interface MappedPush {
	/** T10 narrows to PushTriggerType enum. */
	triggerType: string;
	/** T10 narrows to a keyof User.pushPreferences. */
	prefKey: string;
	title: string;
	body: string;
	data: Record<string, string>;
}

export interface MapCtx {
	organizationId: string;
	communityDomain: string | undefined;
	/**
	 * Resolves a Circle space id → Horse; returns null when the space doesn't
	 * map to a horse.
	 */
	horseBySpace: (spaceId: string) => { id: string; name: string } | null;
}

/**
 * Pure function: convert a single {@link CircleNotification} into the push
 * payload shape consumed by the poller (T11). No I/O — callers supply
 * resolved context (e.g. horse lookup) via {@link MapCtx}.
 *
 * Returns `null` for notification types that are suppressed in V1
 * (`event_reminder`, `admin_event`).
 */
export function mapCircleNotification(
	notification: CircleNotification,
	ctx: MapCtx,
): MappedPush | null {
	const deepLink: Record<string, string> = notification.subject.url
		? { screen: "community", url: notification.subject.url }
		: { screen: "community" };

	switch (notification.type) {
		case "mention":
			return {
				triggerType: "CIRCLE_MENTION",
				prefKey: "circleMention",
				title: "You were mentioned",
				body: notification.text,
				data: deepLink,
			};
		case "comment":
			return {
				triggerType: "CIRCLE_REPLY",
				prefKey: "circleReply",
				title: "New reply",
				body: notification.text,
				data: deepLink,
			};
		case "reaction":
			return {
				triggerType: "CIRCLE_REACTION",
				prefKey: "circleReaction",
				title: "Someone reacted",
				body: notification.text,
				data: deepLink,
			};
		case "dm":
			return {
				triggerType: "CIRCLE_DM",
				prefKey: "circleDm",
				title: notification.actor?.name
					? `Message from ${notification.actor.name}`
					: "New message",
				body: notification.text,
				data: deepLink,
			};
		case "post": {
			// If the post lives in a horse's space, route as horse-discussion for
			// the richer push copy. Otherwise fall back to generic trainer-post.
			if (notification.subject.spaceId) {
				const horse = ctx.horseBySpace(notification.subject.spaceId);
				if (horse) {
					return {
						triggerType: "CIRCLE_HORSE_DISCUSSION",
						prefKey: "circleHorseDiscussion",
						title: `New in ${horse.name}'s space`,
						body: notification.text,
						data: deepLink,
					};
				}
			}
			return {
				triggerType: "TRAINER_POST",
				prefKey: "trainerPost",
				title: "New trainer update",
				body: notification.text,
				data: deepLink,
			};
		}
		case "event_reminder":
		case "admin_event":
			// V2 — suppress in V1.
			return null;
		default: {
			// Exhaustive check: any future CircleNotificationType variant must
			// be handled above. If this assignment fails to compile, add the
			// new case.
			const _exhaustive: never = notification.type;
			void _exhaustive;
			return null;
		}
	}
}
