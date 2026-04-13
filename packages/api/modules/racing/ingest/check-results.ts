/**
 * Results checker
 *
 * Finds races past their postTime where entries don't have results yet,
 * fetches results from the provider, and fires result pushes.
 *
 * @see Architecture/specs/S1-07-ingest-worker.md §8
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";
import type { RacingDataProvider } from "../provider/types";
import { handleStatusTransition } from "./transitions";

export async function checkForResults(
  organizationId: string,
  provider: RacingDataProvider,
): Promise<void> {
  const pendingRaces = await db.race.findMany({
    where: {
      organizationId,
      postTime: { lt: new Date() },
      entries: {
        some: {
          status: { in: ["DECLARED", "ENTERED"] },
          finishingPosition: null,
        },
      },
    },
    include: {
      entries: { include: { horse: true } },
      meeting: { include: { course: true } },
    },
  });

  for (const race of pendingRaces) {
    try {
      const result = await provider.getRaceResult(race.providerEntityId!);
      if (!result) continue;

      for (const entryResult of result.entries) {
        const raceEntry = race.entries.find(
          (e) => e.providerEntityId === entryResult.providerEntryId,
        );
        if (!raceEntry) continue;

        const updated = await db.raceEntry.update({
          where: { id: raceEntry.id },
          data: {
            status: "RAN",
            finishingPosition: entryResult.finishingPosition ?? null,
            beatenLengths: entryResult.beatenLengths ?? null,
            ratingAchieved: entryResult.ratingAchieved ?? null,
            timeformComment: entryResult.timeformComment ?? null,
            performanceRating: entryResult.performanceRating ?? null,
            starRating: entryResult.starRating ?? null,
          },
        });

        await handleStatusTransition(
          organizationId,
          { id: raceEntry.horse.id, name: raceEntry.horse.name },
          {
            id: race.id,
            name: race.name,
            postTime: race.postTime,
            courseName: race.meeting.course.name,
          },
          {
            ...updated,
            finishingPosition: entryResult.finishingPosition ?? null,
          },
          raceEntry.status,
        );
      }
    } catch (error) {
      logger.error(`Result check failed for race ${race.id}`, { error });
    }
  }
}
