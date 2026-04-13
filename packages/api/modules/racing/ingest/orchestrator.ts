/**
 * Ingest orchestrator
 *
 * Multi-org outer loop. Runs for every org with a racing provider configured.
 * Per-org resilience: one org failing doesn't block others.
 *
 * @see Architecture/specs/S1-07-ingest-worker.md §2
 */

import { db } from "@repo/database";
import { parseOrgMetadata } from "@repo/database/types";
import { logger } from "@repo/logs";
import { createRacingProvider } from "../provider";
import { ingestForOrg } from "./ingest-org";

export async function runIngestForAllOrgs(): Promise<void> {
  const orgs = await db.organization.findMany();

  for (const org of orgs) {
    const metadata = parseOrgMetadata(org.metadata);
    if (!metadata.racing?.provider) continue;

    const provider = createRacingProvider(metadata.racing.provider);

    try {
      await ingestForOrg(org.id, provider);
    } catch (error) {
      logger.error(`Ingest failed for org ${org.slug}`, { error });
    }
  }
}
