/**
 * Deterministic per-minute-tick sharding for Circle member polling.
 *
 * The Circle poller (T11) runs once a minute via cron and needs to spread
 * per-member polls across the cadence window so that one large club doesn't
 * hammer Circle's rate limit in a single tick. This helper decides whether
 * a given member's turn is on the current minute.
 *
 * Uses a simple 32-bit djb2-style hash over the member id, bucketed by
 * `cadenceMinutes`. Minute ticks read `Date.getUTCMinutes()` so sharding is
 * timezone-independent.
 */

function hashString(s: string): number {
	let h = 0;
	for (let i = 0; i < s.length; i++) {
		h = (h * 31 + s.charCodeAt(i)) | 0; // 32-bit wrap
	}
	return Math.abs(h);
}

export function pollShard(
	memberId: string,
	now: Date,
	cadenceMinutes: number,
): boolean {
	if (cadenceMinutes <= 1) return true;
	const memberBucket = hashString(memberId) % cadenceMinutes;
	const minuteBucket = now.getUTCMinutes() % cadenceMinutes;
	return memberBucket === minuteBucket;
}
