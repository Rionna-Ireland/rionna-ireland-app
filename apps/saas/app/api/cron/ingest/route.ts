/**
 * Timeform Ingest Cron Endpoint
 *
 * Runs every 15 minutes via Vercel Cron.
 * Polls the racing data provider, diffs state against DB,
 * and fires pushes on transitions.
 *
 * @see Architecture/specs/S1-07-ingest-worker.md
 */

import { runIngestForAllOrgs } from "@repo/api/modules/racing/ingest/orchestrator";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  await runIngestForAllOrgs();
  return Response.json({ ok: true });
}
