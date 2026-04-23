import { describe, it, expect } from "vitest";
import { pollShard } from "../poll-shard";

function dateAtMinute(minute: number): Date {
	// Fixed UTC instant, varying only the minute field.
	return new Date(Date.UTC(2026, 3, 22, 10, minute, 0, 0));
}

describe("pollShard", () => {
	it("returns true for every tick when cadenceMinutes === 1", () => {
		for (let minute = 0; minute < 60; minute++) {
			expect(pollShard("member-1", dateAtMinute(minute), 1)).toBe(true);
			expect(pollShard("member-xyz", dateAtMinute(minute), 1)).toBe(true);
		}
	});

	it("returns true for every tick when cadenceMinutes === 0 (defensive)", () => {
		for (let minute = 0; minute < 60; minute++) {
			expect(pollShard("member-1", dateAtMinute(minute), 0)).toBe(true);
		}
	});

	it("polls each of 10 members exactly once across a 5-minute window (cadence=5)", () => {
		const memberIds = Array.from({ length: 10 }, (_, i) => `member-${i}`);
		for (const id of memberIds) {
			let trueCount = 0;
			for (let minute = 0; minute < 5; minute++) {
				if (pollShard(id, dateAtMinute(minute), 5)) {
					trueCount++;
				}
			}
			expect(trueCount).toBe(1);
		}
	});

	it("polls a single member exactly once across a 60-minute window (cadence=60)", () => {
		const memberId = "member-abc";
		let trueCount = 0;
		for (let minute = 0; minute < 60; minute++) {
			if (pollShard(memberId, dateAtMinute(minute), 60)) {
				trueCount++;
			}
		}
		expect(trueCount).toBe(1);
	});

	it("polls any randomly chosen member exactly once per cadence window for multiple cadences", () => {
		const cadences = [2, 3, 5, 7, 10, 15, 30, 60];
		const memberIds = [
			"alice",
			"bob",
			"carol",
			"dave",
			"eve",
			"m-00000000-0000",
			"m-ffffffff-ffff",
			"x",
		];
		for (const cadence of cadences) {
			for (const id of memberIds) {
				let trueCount = 0;
				for (let minute = 0; minute < cadence; minute++) {
					if (pollShard(id, dateAtMinute(minute), cadence)) {
						trueCount++;
					}
				}
				expect(trueCount, `cadence=${cadence} id=${id}`).toBe(1);
			}
		}
	});

	it("is deterministic — same inputs always yield the same output", () => {
		const id = "member-determinism";
		const date = dateAtMinute(17);
		const cadence = 5;
		const first = pollShard(id, date, cadence);
		for (let i = 0; i < 20; i++) {
			expect(pollShard(id, date, cadence)).toBe(first);
		}
	});

	it("shards two different member ids into different buckets (cadence=60)", () => {
		// Pre-computed: these two ids hash to different buckets under cadence=60.
		// Scan all 60 minutes — if they sharded identically, their truthy minute
		// would match. We assert they fire on distinct minutes.
		const idA = "member-alpha";
		const idB = "member-beta";
		let minuteA = -1;
		let minuteB = -1;
		for (let minute = 0; minute < 60; minute++) {
			if (pollShard(idA, dateAtMinute(minute), 60)) minuteA = minute;
			if (pollShard(idB, dateAtMinute(minute), 60)) minuteB = minute;
		}
		expect(minuteA).toBeGreaterThanOrEqual(0);
		expect(minuteB).toBeGreaterThanOrEqual(0);
		expect(minuteA).not.toBe(minuteB);
	});

	it("uses UTC minutes — two Date objects for the same UTC instant shard identically", () => {
		// Same underlying instant in milliseconds ⇒ same UTC minute ⇒ same shard.
		const iso = "2026-04-22T10:17:00.000Z";
		const dateFromIso = new Date(iso);
		const dateFromEpoch = new Date(dateFromIso.getTime());
		const id = "member-utc";
		const cadence = 7;
		expect(pollShard(id, dateFromIso, cadence)).toBe(
			pollShard(id, dateFromEpoch, cadence),
		);

		// And an instant constructed from a local-time-ish string with explicit
		// offset should collapse to the same UTC minute.
		const dateWithOffset = new Date("2026-04-22T12:17:00.000+02:00");
		expect(dateWithOffset.getTime()).toBe(dateFromIso.getTime());
		expect(pollShard(id, dateWithOffset, cadence)).toBe(
			pollShard(id, dateFromIso, cadence),
		);
	});
});
