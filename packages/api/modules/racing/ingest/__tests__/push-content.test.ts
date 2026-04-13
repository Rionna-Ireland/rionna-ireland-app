/**
 * S1-07: Push content builder tests
 *
 * Pure function tests — no DB, no mocks needed.
 * Covers all three push-worthy transitions and edge cases.
 */

import { describe, it, expect } from "vitest";
import { buildPushContent } from "../push-content";

const mockHorse = { name: "Pink Jasmine" };
const mockRace = {
  name: "Leopardstown Maiden Hurdle",
  courseName: "Leopardstown",
  postTime: new Date("2026-04-15T14:30:00Z"),
};

describe("buildPushContent", () => {
  describe("DECLARED", () => {
    it("returns HORSE_DECLARED trigger type", () => {
      const result = buildPushContent("DECLARED", mockHorse, mockRace, {
        finishingPosition: null,
      });
      expect(result.triggerType).toBe("HORSE_DECLARED");
    });

    it("title includes horse emoji and horse name", () => {
      const result = buildPushContent("DECLARED", mockHorse, mockRace, {
        finishingPosition: null,
      });
      expect(result.title).toContain("\u{1F3C7}");
      expect(result.title).toContain("Pink Jasmine");
      expect(result.title).toContain("declared");
    });

    it("body includes race name, course, and time", () => {
      const result = buildPushContent("DECLARED", mockHorse, mockRace, {
        finishingPosition: null,
      });
      expect(result.body).toContain("Pink Jasmine");
      expect(result.body).toContain("Leopardstown Maiden Hurdle");
      expect(result.body).toContain("Leopardstown");
    });
  });

  describe("NON_RUNNER", () => {
    it("returns HORSE_NON_RUNNER trigger type", () => {
      const result = buildPushContent("NON_RUNNER", mockHorse, mockRace, {
        finishingPosition: null,
      });
      expect(result.triggerType).toBe("HORSE_NON_RUNNER");
    });

    it("title says non-runner", () => {
      const result = buildPushContent("NON_RUNNER", mockHorse, mockRace, {
        finishingPosition: null,
      });
      expect(result.title).toContain("non-runner");
      expect(result.title).toContain("Pink Jasmine");
    });

    it("body says withdrawn", () => {
      const result = buildPushContent("NON_RUNNER", mockHorse, mockRace, {
        finishingPosition: null,
      });
      expect(result.body).toContain("withdrawn");
    });
  });

  describe("RAN — winner", () => {
    it("returns RACE_RESULT trigger type", () => {
      const result = buildPushContent("RAN", mockHorse, mockRace, {
        finishingPosition: 1,
      });
      expect(result.triggerType).toBe("RACE_RESULT");
    });

    it("title includes trophy emoji and wins", () => {
      const result = buildPushContent("RAN", mockHorse, mockRace, {
        finishingPosition: 1,
      });
      expect(result.title).toContain("\u{1F3C6}");
      expect(result.title).toContain("wins");
    });

    it("body says finished 1st", () => {
      const result = buildPushContent("RAN", mockHorse, mockRace, {
        finishingPosition: 1,
      });
      expect(result.body).toContain("1st");
    });
  });

  describe("RAN — non-winner", () => {
    it("title includes ordinal position for 2nd", () => {
      const result = buildPushContent("RAN", mockHorse, mockRace, {
        finishingPosition: 2,
      });
      expect(result.title).toContain("2nd");
      expect(result.title).not.toContain("wins");
    });

    it("title includes ordinal position for 3rd", () => {
      const result = buildPushContent("RAN", mockHorse, mockRace, {
        finishingPosition: 3,
      });
      expect(result.title).toContain("3rd");
    });

    it("title includes ordinal position for 4th", () => {
      const result = buildPushContent("RAN", mockHorse, mockRace, {
        finishingPosition: 4,
      });
      expect(result.title).toContain("4th");
    });

    it("handles 11th, 12th, 13th correctly (special cases)", () => {
      expect(
        buildPushContent("RAN", mockHorse, mockRace, {
          finishingPosition: 11,
        }).title,
      ).toContain("11th");
      expect(
        buildPushContent("RAN", mockHorse, mockRace, {
          finishingPosition: 12,
        }).title,
      ).toContain("12th");
      expect(
        buildPushContent("RAN", mockHorse, mockRace, {
          finishingPosition: 13,
        }).title,
      ).toContain("13th");
    });

    it("handles null finishingPosition gracefully", () => {
      const result = buildPushContent("RAN", mockHorse, mockRace, {
        finishingPosition: null,
      });
      expect(result.triggerType).toBe("RACE_RESULT");
      expect(result.title).toContain("Pink Jasmine");
    });
  });

  describe("edge cases", () => {
    it("handles null race name", () => {
      const raceNoName = { ...mockRace, name: null };
      const result = buildPushContent("DECLARED", mockHorse, raceNoName, {
        finishingPosition: null,
      });
      expect(result.body).toContain("unnamed race");
    });
  });
});
