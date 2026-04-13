/**
 * Per-org ingest loop
 *
 * Loads all horses with a provider link and ingests entries for each.
 * Per-horse resilience: one failure doesn't block others.
 *
 * @see Architecture/specs/S1-07-ingest-worker.md §3
 */

import { db } from "@repo/database";
import { logger } from "@repo/logs";
import type { RacingDataProvider } from "../provider/types";
import { ingestHorse } from "./ingest-horse";
import { checkForResults } from "./check-results";

export async function ingestForOrg(
  organizationId: string,
  provider: RacingDataProvider,
): Promise<void> {
  const horses = await db.horse.findMany({
    where: {
      organizationId,
      providerEntityId: { not: null },
    },
  });

  for (const horse of horses) {
    try {
      await ingestHorse(organizationId, horse, provider);
    } catch (error) {
      logger.error(`Ingest failed for horse ${horse.name} (${horse.id})`, {
        error,
      });
    }
  }

  await checkForResults(organizationId, provider);
}
