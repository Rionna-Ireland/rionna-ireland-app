import { describe, it, expect } from "vitest";
import { mapCircleNotification, type MapCtx } from "../notification-mapper";
import type { CircleNotification } from "@repo/payments/lib/circle/types";

function ctx(overrides: Partial<MapCtx> = {}): MapCtx {
	return {
		organizationId: "org-1",
		communityDomain: "www.rionna-e53dba.club",
		horseBySpace: (sid) =>
			sid === "12" ? { id: "h-1", name: "Thunderbolt" } : null,
		...overrides,
	};
}

function noti(partial: Partial<CircleNotification>): CircleNotification {
	return {
		id: partial.id ?? "1",
		type: partial.type ?? "post",
		createdAt: partial.createdAt ?? "2026-04-23T10:00:00Z",
		actor: "actor" in partial ? partial.actor ?? null : { id: "a", name: "Alice" },
		subject: partial.subject ?? { kind: "post", id: "5", url: "https://c/p/5" },
		text: partial.text ?? "some text",
	};
}

describe("mapCircleNotification", () => {
	it("mention → CIRCLE_MENTION push", () => {
		const out = mapCircleNotification(
			noti({ type: "mention", text: "Alice mentioned you" }),
			ctx(),
		);
		expect(out).toMatchObject({
			triggerType: "CIRCLE_MENTION",
			prefKey: "circleMention",
			title: "You were mentioned",
			body: "Alice mentioned you",
		});
		expect(out?.data).toMatchObject({
			screen: "community",
			url: "https://c/p/5",
		});
	});

	it("comment → CIRCLE_REPLY push", () => {
		const out = mapCircleNotification(
			noti({ type: "comment", text: "Alice replied" }),
			ctx(),
		);
		expect(out?.triggerType).toBe("CIRCLE_REPLY");
		expect(out?.prefKey).toBe("circleReply");
	});

	it("reaction → CIRCLE_REACTION push", () => {
		const out = mapCircleNotification(noti({ type: "reaction" }), ctx());
		expect(out?.triggerType).toBe("CIRCLE_REACTION");
	});

	it("dm → CIRCLE_DM push with actor name in title", () => {
		const out = mapCircleNotification(
			noti({ type: "dm", actor: { id: "a", name: "Alice" }, text: "hi" }),
			ctx(),
		);
		expect(out?.title).toBe("Message from Alice");
		expect(out?.triggerType).toBe("CIRCLE_DM");
	});

	it("dm with no actor → generic title", () => {
		const out = mapCircleNotification(
			noti({ type: "dm", actor: null, text: "hi" }),
			ctx(),
		);
		expect(out?.title).toBe("New message");
	});

	it("post in horse space → CIRCLE_HORSE_DISCUSSION with horse name", () => {
		const out = mapCircleNotification(
			noti({
				type: "post",
				subject: {
					kind: "post",
					id: "9",
					spaceId: "12",
					url: "https://c/p/9",
				},
			}),
			ctx(),
		);
		expect(out?.triggerType).toBe("CIRCLE_HORSE_DISCUSSION");
		expect(out?.title).toBe("New in Thunderbolt's space");
	});

	it("post in non-horse space → TRAINER_POST fallback", () => {
		const out = mapCircleNotification(
			noti({
				type: "post",
				subject: {
					kind: "post",
					id: "9",
					spaceId: "999",
					url: "https://c/p/9",
				},
			}),
			ctx(),
		);
		expect(out?.triggerType).toBe("TRAINER_POST");
		expect(out?.title).toBe("New trainer update");
	});

	it("post with no spaceId → TRAINER_POST fallback", () => {
		const out = mapCircleNotification(
			noti({
				type: "post",
				subject: { kind: "post", id: "9", url: "https://c/p/9" },
			}),
			ctx(),
		);
		expect(out?.triggerType).toBe("TRAINER_POST");
	});

	it("event_reminder → null (deferred to V2)", () => {
		const out = mapCircleNotification(
			noti({ type: "event_reminder" }),
			ctx(),
		);
		expect(out).toBeNull();
	});

	it("admin_event → null (deferred to V2)", () => {
		const out = mapCircleNotification(noti({ type: "admin_event" }), ctx());
		expect(out).toBeNull();
	});

	it("notification with no subject.url → data has screen only", () => {
		const out = mapCircleNotification(
			noti({ type: "mention", subject: { kind: "post", id: "5" } }),
			ctx(),
		);
		expect(out?.data).toEqual({ screen: "community" });
	});
});
