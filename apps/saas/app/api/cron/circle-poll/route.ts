/**
 * Circle Notification Poller Cron Endpoint
 *
 * Runs every minute via Vercel Cron.
 * Polls Circle for new notifications across all eligible members and
 * fires pushes on mapped triggers.
 *
 * Org iteration, per-org sharding, per-member concurrency, and all
 * per-org/per-member error handling live inside `runCirclePollTick`
 * (S6-01 / T11). This route is just an authenticated trigger.
 *
 * @see Architecture/specs/S6-01-circle-notifications.md
 */

import { runCirclePollTick } from "@repo/api/modules/circle/poller";
import { logger } from "@repo/logs";

export async function POST(request: Request) {
	const authHeader = request.headers.get("authorization");
	if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
		return new Response("Unauthorized", { status: 401 });
	}

	const metrics = await runCirclePollTick();
	logger.info("circle.poll.cron.complete", metrics);

	return Response.json({ ok: true, metrics });
}
