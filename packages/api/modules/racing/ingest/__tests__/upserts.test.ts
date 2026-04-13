/**
 * S1-07: Upsert helper tests
 *
 * Verifies that course identity comes from provider course identity rather
 * than the mutable course name.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCourseUpsert = vi.fn().mockResolvedValue({ id: "course-1" });

vi.mock("@repo/database", () => ({
  db: {
    course: {
      upsert: (...args: unknown[]) => mockCourseUpsert(...args),
    },
  },
}));

import { upsertCourse } from "../upserts";

describe("upsertCourse", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses providerCourseId as the course providerEntityId", async () => {
    await upsertCourse("org-1", {
      providerMeetingId: "provider-meeting-123",
      providerCourseId: "provider-course-456",
      courseName: "Leopardstown",
      courseCountry: "IE",
      date: new Date("2026-04-13T09:00:00Z"),
    });

    expect(mockCourseUpsert).toHaveBeenCalledWith({
      where: {
        organizationId_providerEntityId: {
          organizationId: "org-1",
          providerEntityId: "provider-course-456",
        },
      },
      create: {
        organizationId: "org-1",
        providerEntityId: "provider-course-456",
        name: "Leopardstown",
        country: "IE",
      },
      update: {
        name: "Leopardstown",
      },
    });
  });
});
