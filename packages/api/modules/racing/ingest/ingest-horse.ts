/**
 * Per-horse ingest
 *
 * Fetches entries from the provider and upserts the
 * Course → Meeting → Race → RaceEntry chain, detecting
 * status transitions along the way.
 *
 * @see Architecture/specs/S1-07-ingest-worker.md §4
 */

import { db } from "@repo/database";
import type { RacingDataProvider } from "../provider/types";
import {
  upsertCourse,
  upsertMeeting,
  upsertRace,
  upsertJockey,
  upsertRaceEntry,
} from "./upserts";
import { handleStatusTransition } from "./transitions";

interface IngestHorse {
  id: string;
  name: string;
  providerEntityId: string | null;
  trainerId: string | null;
}

export async function ingestHorse(
  organizationId: string,
  horse: IngestHorse,
  provider: RacingDataProvider,
): Promise<void> {
  const entries = await provider.getEntriesForHorse(horse.providerEntityId!, {
    lookAheadDays: 7,
  });

  for (const entry of entries) {
    const course = await upsertCourse(organizationId, entry.meeting);
    const meeting = await upsertMeeting(
      organizationId,
      course.id,
      entry.meeting,
    );
    const race = await upsertRace(organizationId, meeting.id, entry.race);

    let jockeyId: string | undefined;
    if (entry.entry.providerJockeyId) {
      const jockey = await upsertJockey(organizationId, entry.entry);
      jockeyId = jockey.id;
    }

    const { raceEntry, previousStatus } = await upsertRaceEntry(
      organizationId,
      horse.id,
      race.id,
      jockeyId,
      horse.trainerId,
      entry.entry,
    );

    if (previousStatus !== raceEntry.status) {
      await handleStatusTransition(
        organizationId,
        { id: horse.id, name: horse.name },
        {
          id: race.id,
          name: race.name,
          postTime: race.postTime,
          courseName: course.name,
        },
        raceEntry,
        previousStatus,
      );
    }
  }

  // Update horse sync timestamp
  await db.horse.update({
    where: { id: horse.id },
    data: { providerLastSync: new Date() },
  });
}
