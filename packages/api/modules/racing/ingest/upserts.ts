/**
 * Upsert helpers for the ingest worker
 *
 * Each upsert uses providerEntityId as the match key.
 * Course uses a slug derived from courseName (not from providerMeetingId).
 *
 * @see Architecture/specs/S1-07-ingest-worker.md §5
 */

import { db } from "@repo/database";
import type { ProviderEntry } from "../provider/types";

function courseSlug(courseName: string): string {
  return courseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function upsertCourse(
  organizationId: string,
  meeting: ProviderEntry["meeting"],
) {
  const providerEntityId = courseSlug(meeting.courseName);
  return db.course.upsert({
    where: {
      organizationId_providerEntityId: {
        organizationId,
        providerEntityId,
      },
    },
    create: {
      organizationId,
      providerEntityId,
      name: meeting.courseName,
      country: meeting.courseCountry ?? null,
    },
    update: {
      name: meeting.courseName,
    },
  });
}

export async function upsertMeeting(
  organizationId: string,
  courseId: string,
  meeting: ProviderEntry["meeting"],
) {
  return db.meeting.upsert({
    where: {
      organizationId_providerEntityId: {
        organizationId,
        providerEntityId: meeting.providerMeetingId,
      },
    },
    create: {
      organizationId,
      providerEntityId: meeting.providerMeetingId,
      courseId,
      date: meeting.date,
    },
    update: {
      date: meeting.date,
    },
  });
}

export async function upsertRace(
  organizationId: string,
  meetingId: string,
  race: ProviderEntry["race"],
) {
  return db.race.upsert({
    where: {
      organizationId_providerEntityId: {
        organizationId,
        providerEntityId: race.providerRaceId,
      },
    },
    create: {
      organizationId,
      providerEntityId: race.providerRaceId,
      meetingId,
      postTime: race.postTime,
      name: race.name ?? null,
      raceType: race.raceType ?? null,
      distanceFurlongs: race.distanceFurlongs ?? null,
      className: race.className ?? null,
      prizeMoney: race.prizeMoney ?? null,
      goingDescription: race.goingDescription ?? null,
    },
    update: {
      postTime: race.postTime,
      name: race.name ?? null,
      raceType: race.raceType ?? null,
      distanceFurlongs: race.distanceFurlongs ?? null,
      className: race.className ?? null,
      prizeMoney: race.prizeMoney ?? null,
      goingDescription: race.goingDescription ?? null,
    },
  });
}

export async function upsertJockey(
  organizationId: string,
  entry: ProviderEntry["entry"],
) {
  return db.jockey.upsert({
    where: {
      organizationId_providerEntityId: {
        organizationId,
        providerEntityId: entry.providerJockeyId!,
      },
    },
    create: {
      organizationId,
      providerEntityId: entry.providerJockeyId!,
      name: entry.jockeyName ?? "Unknown",
    },
    update: {
      name: entry.jockeyName ?? "Unknown",
    },
  });
}

export async function upsertRaceEntry(
  organizationId: string,
  horseId: string,
  raceId: string,
  jockeyId: string | undefined,
  trainerId: string | null,
  entry: ProviderEntry["entry"],
) {
  const existing = await db.raceEntry.findFirst({
    where: {
      organizationId,
      providerEntityId: entry.providerEntryId,
    },
  });

  const previousStatus = existing?.status ?? null;

  const raceEntry = await db.raceEntry.upsert({
    where: {
      organizationId_providerEntityId: {
        organizationId,
        providerEntityId: entry.providerEntryId,
      },
    },
    create: {
      organizationId,
      providerEntityId: entry.providerEntryId,
      horseId,
      raceId,
      status: entry.status,
      draw: entry.draw ?? null,
      weightLbs: entry.weightLbs ?? null,
      jockeyId: jockeyId ?? null,
      trainerId: trainerId ?? null,
      notifiedStates: [],
    },
    update: {
      status: entry.status,
      draw: entry.draw ?? null,
      weightLbs: entry.weightLbs ?? null,
      jockeyId: jockeyId ?? null,
      trainerId: trainerId ?? null,
    },
  });

  return { raceEntry, previousStatus };
}
