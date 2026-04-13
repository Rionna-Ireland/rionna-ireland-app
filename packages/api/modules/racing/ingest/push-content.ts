/**
 * Push notification content builder
 *
 * Push text lives here (not hard-coded in the worker) so it's
 * easy to tweak without touching ingest logic.
 *
 * @see Architecture/specs/S1-07-ingest-worker.md §7
 */

interface PushContentHorse {
  name: string;
}

interface PushContentRace {
  name: string | null;
  courseName: string;
  postTime: Date;
}

interface PushContentEntry {
  finishingPosition: number | null;
}

interface PushContent {
  triggerType: "HORSE_DECLARED" | "HORSE_NON_RUNNER" | "RACE_RESULT";
  title: string;
  body: string;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/London",
  });
}

function ordinal(n: number | null): string {
  if (n == null) return "N/A";
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

export function buildPushContent(
  status: "DECLARED" | "NON_RUNNER" | "RAN",
  horse: PushContentHorse,
  race: PushContentRace,
  raceEntry: PushContentEntry,
): PushContent {
  const raceName = race.name ?? "unnamed race";
  const courseName = race.courseName;

  switch (status) {
    case "DECLARED":
      return {
        triggerType: "HORSE_DECLARED",
        title: `\u{1F3C7} ${horse.name} is declared!`,
        body: `${horse.name} runs in the ${raceName} at ${courseName}, ${formatTime(race.postTime)}`,
      };
    case "NON_RUNNER":
      return {
        triggerType: "HORSE_NON_RUNNER",
        title: `${horse.name} is a non-runner`,
        body: `${horse.name} has been withdrawn from ${raceName} at ${courseName}`,
      };
    case "RAN": {
      const pos = raceEntry.finishingPosition;
      if (pos === 1) {
        return {
          triggerType: "RACE_RESULT",
          title: `\u{1F3C6} ${horse.name} wins!`,
          body: `${horse.name} finished 1st in ${raceName} at ${courseName}`,
        };
      }
      return {
        triggerType: "RACE_RESULT",
        title: `${horse.name} finished ${ordinal(pos)}`,
        body: `${horse.name} finished ${ordinal(pos)} in ${raceName} at ${courseName}`,
      };
    }
  }
}
