import type { PushTriggerType } from "@repo/database";
import type { CircleNotification } from "@repo/payments/lib/circle/types";

/**
 * Subset of {@link PushTriggerType} that the Circle notification mapper can
 * emit. Narrowed (vs. the full enum) so T11's poller fan-out can reason about
 * which trigger types originate from the Circle pipeline vs. the news /
 * race ingest workers.
 */
export type CircleMapperTrigger = Extract<
	PushTriggerType,
	| "CIRCLE_MENTION"
	| "CIRCLE_REPLY"
	| "CIRCLE_REACTION"
	| "CIRCLE_DM"
	| "CIRCLE_HORSE_DISCUSSION"
	| "TRAINER_POST"
>;

/**
 * Keys on `User.pushPreferences` (JSON) that the Circle mapper targets. Kept
 * as a string-literal union so the poller and the sendPush audience filter
 * share a single source of truth for pref-key spelling.
 */
export type CircleMapperPrefKey =
	| "circleMention"
	| "circleReply"
	| "circleReaction"
	| "circleDm"
	| "circleHorseDiscussion"
	| "trainerPost";

/**
 * Output shape the poller hands to sendPush. Narrowed from the T8 placeholder
 * `string` types now that T10 has extended {@link PushTriggerType} and the
 * user-preference zod schema with Circle-origin categories.
 */
export interface MappedPush {
	triggerType: CircleMapperTrigger;
	prefKey: CircleMapperPrefKey;
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
