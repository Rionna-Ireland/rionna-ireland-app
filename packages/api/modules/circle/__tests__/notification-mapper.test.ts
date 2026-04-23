import {describe, it, expect} from "vitest";
import {mapCircleNotification, type MapCtx} from "../notification-mapper";
import type {CircleNotification} from "@repo/payments/lib/circle/types";

function ctx(overrides: Partial<MapCtx> = {}): MapCtx
{
    return {
        organizationId : "org-1",
        communityDomain : "community.rionna-e53dba.club",
        trainerUpdatesSpaceId : "trainer-space",
        horseBySpace : (sid) =>
          sid === "12" ? { id : "h-1", name : "Thunderbolt" } : null,
        ...overrides,
    };
}

function noti(partial: Partial<CircleNotification>): CircleNotification
{
    return {
        id : partial.id ?? "1",
        type : partial.type ?? "post",
        createdAt : partial.createdAt ?? "2026-04-23T10:00:00Z",
        actor : "actor" in partial ? partial.actor ?? null
                                   : { id : "a", name : "Alice" },
        subject :
          partial.subject ?? { kind : "post", id : "5", url : "https://c/p/5" },
        spaceTitle : partial.spaceTitle,
        displayAction : partial.displayAction,
        text : partial.text ?? "some text",
    };
}

describe("mapCircleNotification", () => {
    it("mention → CIRCLE_MENTION push with actor/display-action title", () => {
        const out = mapCircleNotification(
          noti({
              type : "mention",
              text : "TEST",
              displayAction : "mentioned you in a comment on:",
              subject : { kind : "comment", id : "5", url : "https://c/p/5" },
          }),
          ctx(),
        );
        expect(out).toMatchObject({
            triggerType : "CIRCLE_MENTION",
            prefKey : "circleMention",
            title : "Alice mentioned you in a comment on",
            body : "TEST",
        });
        expect(out?.data).toMatchObject({
            screen : "community",
            url : "https://c/p/5",
        });
    });

    it("comment → CIRCLE_REPLY push with display-action title", () => {
        const out = mapCircleNotification(
          noti({
              type : "comment",
              text : "I agree",
              displayAction : "commented on your post:",
              subject : { kind : "comment", id : "5", url : "https://c/p/5" },
          }),
          ctx(),
        );
        expect(out).toMatchObject({
            triggerType : "CIRCLE_REPLY",
            prefKey : "circleReply",
            title : "Alice commented on your post",
            body : "I agree",
        });
    });

    it("reaction → CIRCLE_REACTION push with display-action title", () => {
        const out = mapCircleNotification(
          noti({
              type : "reaction",
              text : "Wow I love horses!",
              displayAction : "liked your post:",
              subject : { kind : "comment", id : "5", url : "https://c/p/5" },
          }),
          ctx(),
        );
        expect(out).toMatchObject({
            triggerType : "CIRCLE_REACTION",
            title : "Alice liked your post",
            body : "Wow I love horses!",
        });
    });

    it("dm → CIRCLE_DM push with actor-aware title", () => {
        const out = mapCircleNotification(
          noti(
            { type : "dm", actor : { id : "a", name : "Alice" }, text : "hi" }),
          ctx(),
        );
        expect(out).toMatchObject({
            triggerType : "CIRCLE_DM",
            title : "Alice sent you a message",
            body : "hi",
        });
    });

    it("dm with no actor → generic title and fallback body", () => {
        const out = mapCircleNotification(
          noti({ type : "dm", actor : null, text : "   " }),
          ctx(),
        );
        expect(out).toMatchObject({
            title : "New message in Circle",
            body : "Open your messages in Circle.",
        });
    });

    it("post in horse space → CIRCLE_HORSE_DISCUSSION with horse-context copy", () => {
        const out = mapCircleNotification(
          noti({
              type : "post",
              text : "Fresh training notes",
              subject : {
                  kind : "post",
                  id : "9",
                  spaceId : "12",
                  url : "https://c/p/9",
              },
          }),
          ctx(),
        );
        expect(out?.triggerType).toBe("CIRCLE_HORSE_DISCUSSION");
        expect(out).toMatchObject({
            title : "Alice posted in Thunderbolt's space",
            body : "Fresh training notes",
        });
    });

    it("trainer-updates space post → TRAINER_POST trainer copy", () => {
        const out = mapCircleNotification(
          noti({
              type : "post",
              text : "Stable update",
              spaceTitle : "Trainer Updates",
              subject : {
                  kind : "post",
                  id : "9",
                  spaceId : "trainer-space",
                  url : "https://c/p/9",
              },
          }),
          ctx(),
        );
        expect(out).toMatchObject({
            triggerType : "TRAINER_POST",
            title : "Alice posted a trainer update",
            body : "Stable update",
        });
    });

    it("non-horse non-trainer post → TRAINER_POST bucket but generic space-aware copy", () => {
        const out = mapCircleNotification(
          noti({
              type : "post",
              text : "Stable update",
              displayAction : "posted",
              spaceTitle : "News",
              subject : {
                  kind : "post",
                  id : "9",
                  spaceId : "999",
                  url : "https://c/p/9",
              },
          }),
          ctx(),
        );
        expect(out).toMatchObject({
            triggerType : "TRAINER_POST",
            title : "Alice posted in News",
            body : "Stable update",
        });
    });

    it("post with no spaceId → TRAINER_POST fallback body when text missing", () => {
        const out = mapCircleNotification(
          noti({
              type : "post",
              actor : null,
              text : "   ",
              subject : { kind : "post", id : "9", url : "https://c/p/9" },
          }),
          ctx(),
        );
        expect(out).toMatchObject({
            triggerType : "TRAINER_POST",
            title : "New post in Circle",
            body : "Open the latest post in Circle.",
        });
    });

    it("event_reminder → null (deferred to V2)", () => {
        const out = mapCircleNotification(
          noti({ type : "event_reminder" }),
          ctx(),
        );
        expect(out).toBeNull();
    });

    it("admin_event → null (deferred to V2)", () => {
        const out =
          mapCircleNotification(noti({ type : "admin_event" }), ctx());
        expect(out).toBeNull();
    });

    it("notification with no subject.url → data has screen only", () => {
        const out = mapCircleNotification(
          noti({ type : "mention", subject : { kind : "post", id : "5" } }),
          ctx(),
        );
        expect(out?.data).toEqual({ screen : "community" });
    });

    it("trims actor and body copy before mapping", () => {
        const out = mapCircleNotification(
          noti({
              type : "mention",
              actor : { id : "a", name : "  Alice   " },
              text : "  Big update   incoming  ",
              subject : { kind : "post", id : "5", url : "https://c/p/5" },
          }),
          ctx(),
        );
        expect(out).toMatchObject({
            title : "You were mentioned",
            body : "Big update incoming",
        });
    });
});
