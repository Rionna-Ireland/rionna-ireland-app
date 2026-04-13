/**
 * Mock fixtures for the MockRacingDataProvider.
 *
 * All dates are computed relative to Date.now() so the mock always
 * contains a mix of past and future races. This drives realistic
 * status transitions (ENTERED -> DECLARED -> RAN) over time.
 *
 * Contains: 5 horses, 3 meetings, 8 races, 1 non-runner, 1 dead-heat.
 */

import type { ProviderEntry, ProviderHorse, ProviderResult } from "./types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hoursFromNow(hours: number): Date {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function daysFromNow(days: number): Date {
  return hoursFromNow(days * 24);
}

// ---------------------------------------------------------------------------
// Horse profiles
// ---------------------------------------------------------------------------

const HORSE_PROFILES: ProviderHorse[] = [
  {
    providerHorseId: "mock-horse-001",
    name: "Pink Jasmine",
    sire: "Frankel",
    dam: "Rose Blossom",
    damsire: "Galileo",
    trainerName: "W. P. Mullins",
    providerTrainerId: "mock-trainer-001",
    age: 4,
    colour: "Bay",
    sex: "Mare",
  },
  {
    providerHorseId: "mock-horse-002",
    name: "Crimson Tide",
    sire: "Sea The Stars",
    dam: "Red Current",
    damsire: "Danehill",
    trainerName: "W. P. Mullins",
    providerTrainerId: "mock-trainer-001",
    age: 5,
    colour: "Chestnut",
    sex: "Gelding",
  },
  {
    providerHorseId: "mock-horse-003",
    name: "Emerald Dream",
    sire: "Dubawi",
    dam: "Green Light",
    damsire: "Sadler's Wells",
    trainerName: "G. Elliott",
    providerTrainerId: "mock-trainer-002",
    age: 3,
    colour: "Grey",
    sex: "Colt",
  },
  {
    providerHorseId: "mock-horse-004",
    name: "Golden Arrow",
    sire: "Camelot",
    dam: "Gilt Edge",
    damsire: "Montjeu",
    trainerName: "G. Elliott",
    providerTrainerId: "mock-trainer-002",
    age: 6,
    colour: "Bay",
    sex: "Gelding",
  },
  {
    providerHorseId: "mock-horse-005",
    name: "Silver Lining",
    sire: "Dark Angel",
    dam: "Platinum Star",
    damsire: "Pivotal",
    trainerName: "J. P. O'Brien",
    providerTrainerId: "mock-trainer-003",
    age: 4,
    colour: "Grey",
    sex: "Filly",
  },
];

// ---------------------------------------------------------------------------
// Meetings — 1 past, 1 today-ish, 1 future
// ---------------------------------------------------------------------------

interface MockMeeting {
  providerMeetingId: string;
  providerCourseId: string;
  courseName: string;
  courseCountry: string;
  date: Date;
}

const MEETINGS: MockMeeting[] = [
  {
    providerMeetingId: "mock-meeting-001",
    providerCourseId: "mock-course-leopardstown",
    courseName: "Leopardstown",
    courseCountry: "IE",
    date: daysFromNow(-2), // 2 days ago
  },
  {
    providerMeetingId: "mock-meeting-002",
    providerCourseId: "mock-course-curragh",
    courseName: "Curragh",
    courseCountry: "IE",
    date: daysFromNow(0), // today
  },
  {
    providerMeetingId: "mock-meeting-003",
    providerCourseId: "mock-course-cheltenham",
    courseName: "Cheltenham",
    courseCountry: "GB",
    date: daysFromNow(3), // 3 days from now
  },
];

// ---------------------------------------------------------------------------
// Races — 8 total across the 3 meetings
// ---------------------------------------------------------------------------

interface MockRace {
  providerRaceId: string;
  meeting: MockMeeting;
  postTime: Date;
  name: string;
  raceType: string;
  distanceFurlongs: number;
  className: string;
  prizeMoney: number;
  goingDescription: string;
}

const RACES: MockRace[] = [
  // Meeting 1: Leopardstown (past) — 3 races
  {
    providerRaceId: "mock-race-001",
    meeting: MEETINGS[0],
    postTime: hoursFromNow(-50),
    name: "Leopardstown Maiden Hurdle",
    raceType: "nh_hurdle",
    distanceFurlongs: 16,
    className: "Class 4",
    prizeMoney: 1200000, // in pence = GBP 12,000
    goingDescription: "Soft",
  },
  {
    providerRaceId: "mock-race-002",
    meeting: MEETINGS[0],
    postTime: hoursFromNow(-49),
    name: "Leopardstown Novice Chase",
    raceType: "nh_chase",
    distanceFurlongs: 20,
    className: "Class 3",
    prizeMoney: 2500000,
    goingDescription: "Soft",
  },
  {
    providerRaceId: "mock-race-003",
    meeting: MEETINGS[0],
    postTime: hoursFromNow(-48),
    name: "Leopardstown Handicap Hurdle",
    raceType: "nh_hurdle",
    distanceFurlongs: 20,
    className: "Class 2",
    prizeMoney: 3500000,
    goingDescription: "Soft",
  },
  // Meeting 2: Curragh (today) — 3 races, some past some future
  {
    providerRaceId: "mock-race-004",
    meeting: MEETINGS[1],
    postTime: hoursFromNow(-3),
    name: "Curragh Sprint Stakes",
    raceType: "flat",
    distanceFurlongs: 6,
    className: "Group 3",
    prizeMoney: 5000000,
    goingDescription: "Good to Firm",
  },
  {
    providerRaceId: "mock-race-005",
    meeting: MEETINGS[1],
    postTime: hoursFromNow(2),
    name: "Curragh Mile Handicap",
    raceType: "flat",
    distanceFurlongs: 8,
    className: "Class 2",
    prizeMoney: 2000000,
    goingDescription: "Good to Firm",
  },
  {
    providerRaceId: "mock-race-006",
    meeting: MEETINGS[1],
    postTime: hoursFromNow(5),
    name: "Curragh Maiden",
    raceType: "flat",
    distanceFurlongs: 10,
    className: "Class 4",
    prizeMoney: 1000000,
    goingDescription: "Good to Firm",
  },
  // Meeting 3: Cheltenham (future) — 2 races
  {
    providerRaceId: "mock-race-007",
    meeting: MEETINGS[2],
    postTime: hoursFromNow(74),
    name: "Cheltenham Gold Cup Trial",
    raceType: "nh_chase",
    distanceFurlongs: 24,
    className: "Grade 2",
    prizeMoney: 7500000,
    goingDescription: "Good to Soft",
  },
  {
    providerRaceId: "mock-race-008",
    meeting: MEETINGS[2],
    postTime: hoursFromNow(76),
    name: "Cheltenham Champion Hurdle Trial",
    raceType: "nh_hurdle",
    distanceFurlongs: 16,
    className: "Grade 2",
    prizeMoney: 6000000,
    goingDescription: "Good to Soft",
  },
];

// ---------------------------------------------------------------------------
// Build ProviderEntry rows per horse
// ---------------------------------------------------------------------------

function buildEntry(
  horse: ProviderHorse,
  race: MockRace,
  entryIndex: number,
  overrides?: Partial<ProviderEntry["entry"]>,
): ProviderEntry {
  return {
    providerHorseId: horse.providerHorseId,
    meeting: {
      providerMeetingId: race.meeting.providerMeetingId,
      providerCourseId: race.meeting.providerCourseId,
      courseName: race.meeting.courseName,
      courseCountry: race.meeting.courseCountry,
      date: race.meeting.date,
    },
    race: {
      providerRaceId: race.providerRaceId,
      postTime: race.postTime,
      name: race.name,
      raceType: race.raceType,
      distanceFurlongs: race.distanceFurlongs,
      className: race.className,
      prizeMoney: race.prizeMoney,
      goingDescription: race.goingDescription,
    },
    entry: {
      providerEntryId: `mock-entry-${race.providerRaceId}-${horse.providerHorseId}-${entryIndex}`,
      // Status is always "ENTERED" in the fixture — the mock provider
      // overrides it at query time based on postTime vs now.
      status: "ENTERED",
      draw: entryIndex + 1,
      weightLbs: 150 + entryIndex * 2,
      jockeyName:
        horse.providerTrainerId === "mock-trainer-001"
          ? "P. Townend"
          : horse.providerTrainerId === "mock-trainer-002"
            ? "J. W. Kennedy"
            : "R. Moore",
      providerJockeyId: `mock-jockey-${entryIndex}`,
      trainerName: horse.trainerName,
      providerTrainerId: horse.providerTrainerId,
      ...overrides,
    },
  };
}

// ---------------------------------------------------------------------------
// Horse entry assignments
// ---------------------------------------------------------------------------

interface MockHorseData {
  profile: ProviderHorse;
  providerHorseId: string;
  entries: ProviderEntry[];
}

const HORSE_ENTRIES: MockHorseData[] = [
  // Horse 1: Pink Jasmine — ran at Leopardstown, declared at Curragh, entered at Cheltenham
  {
    profile: HORSE_PROFILES[0],
    providerHorseId: HORSE_PROFILES[0].providerHorseId,
    entries: [
      buildEntry(HORSE_PROFILES[0], RACES[0], 0), // Leopardstown race 1 (past)
      buildEntry(HORSE_PROFILES[0], RACES[4], 0), // Curragh race 5 (today, future)
      buildEntry(HORSE_PROFILES[0], RACES[7], 0), // Cheltenham race 8 (future)
    ],
  },
  // Horse 2: Crimson Tide — ran at Leopardstown twice, entered at Cheltenham
  {
    profile: HORSE_PROFILES[1],
    providerHorseId: HORSE_PROFILES[1].providerHorseId,
    entries: [
      buildEntry(HORSE_PROFILES[1], RACES[1], 1), // Leopardstown race 2 (past)
      buildEntry(HORSE_PROFILES[1], RACES[2], 1), // Leopardstown race 3 (past)
      buildEntry(HORSE_PROFILES[1], RACES[6], 1), // Cheltenham race 7 (future)
    ],
  },
  // Horse 3: Emerald Dream — ran at Curragh (past race), has NON_RUNNER for today's race
  {
    profile: HORSE_PROFILES[2],
    providerHorseId: HORSE_PROFILES[2].providerHorseId,
    entries: [
      buildEntry(HORSE_PROFILES[2], RACES[3], 2), // Curragh race 4 (past today)
      buildEntry(HORSE_PROFILES[2], RACES[5], 2, {
        status: "NON_RUNNER",
      }), // NON_RUNNER scenario
      buildEntry(HORSE_PROFILES[2], RACES[7], 2), // Cheltenham race 8 (future)
    ],
  },
  // Horse 4: Golden Arrow — ran at Leopardstown, declared at Curragh
  {
    profile: HORSE_PROFILES[3],
    providerHorseId: HORSE_PROFILES[3].providerHorseId,
    entries: [
      buildEntry(HORSE_PROFILES[3], RACES[0], 3), // Leopardstown race 1 (past)
      buildEntry(HORSE_PROFILES[3], RACES[4], 3), // Curragh race 5 (today, future)
      buildEntry(HORSE_PROFILES[3], RACES[6], 3), // Cheltenham race 7 (future)
    ],
  },
  // Horse 5: Silver Lining — ran at Leopardstown, entered at Cheltenham
  {
    profile: HORSE_PROFILES[4],
    providerHorseId: HORSE_PROFILES[4].providerHorseId,
    entries: [
      buildEntry(HORSE_PROFILES[4], RACES[2], 4), // Leopardstown race 3 (past)
      buildEntry(HORSE_PROFILES[4], RACES[3], 4), // Curragh race 4 (past today)
      buildEntry(HORSE_PROFILES[4], RACES[7], 4), // Cheltenham race 8 (future)
    ],
  },
];

// ---------------------------------------------------------------------------
// Race results (only meaningful for past races)
// ---------------------------------------------------------------------------

interface MockRaceWithResult {
  providerRaceId: string;
  postTime: Date;
  result: ProviderResult | null;
}

const RACE_DATA: MockRaceWithResult[] = [
  // Race 1: Leopardstown Maiden Hurdle — Pink Jasmine wins, Golden Arrow 2nd
  {
    providerRaceId: "mock-race-001",
    postTime: RACES[0].postTime,
    result: {
      providerRaceId: "mock-race-001",
      entries: [
        {
          providerEntryId: `mock-entry-mock-race-001-mock-horse-001-0`,
          finishingPosition: 1,
          beatenLengths: 0,
          ratingAchieved: 132,
          timeformComment:
            "Made all, jumped well throughout, drew clear from 2 out.",
        },
        {
          providerEntryId: `mock-entry-mock-race-001-mock-horse-004-3`,
          finishingPosition: 2,
          beatenLengths: 3.5,
          ratingAchieved: 125,
          timeformComment: "Chased winner throughout, no impression from 2 out.",
        },
      ],
    },
  },
  // Race 2: Leopardstown Novice Chase — Crimson Tide wins
  {
    providerRaceId: "mock-race-002",
    postTime: RACES[1].postTime,
    result: {
      providerRaceId: "mock-race-002",
      entries: [
        {
          providerEntryId: `mock-entry-mock-race-002-mock-horse-002-1`,
          finishingPosition: 1,
          beatenLengths: 0,
          ratingAchieved: 145,
          timeformComment:
            "Impressive display, travelled well and quickened clear.",
        },
      ],
    },
  },
  // Race 3: Leopardstown Handicap Hurdle — dead heat: Crimson Tide and Silver Lining both 1st
  {
    providerRaceId: "mock-race-003",
    postTime: RACES[2].postTime,
    result: {
      providerRaceId: "mock-race-003",
      entries: [
        {
          providerEntryId: `mock-entry-mock-race-003-mock-horse-002-1`,
          finishingPosition: 1,
          beatenLengths: 0,
          ratingAchieved: 138,
          timeformComment:
            "Dead-heated with Silver Lining, rallied gamely on the run-in.",
        },
        {
          providerEntryId: `mock-entry-mock-race-003-mock-horse-005-4`,
          finishingPosition: 1,
          beatenLengths: 0,
          ratingAchieved: 138,
          timeformComment:
            "Dead-heated with Crimson Tide, stayed on strongly.",
        },
      ],
    },
  },
  // Race 4: Curragh Sprint Stakes — past today, Emerald Dream wins
  {
    providerRaceId: "mock-race-004",
    postTime: RACES[3].postTime,
    result: {
      providerRaceId: "mock-race-004",
      entries: [
        {
          providerEntryId: `mock-entry-mock-race-004-mock-horse-003-2`,
          finishingPosition: 1,
          beatenLengths: 0,
          ratingAchieved: 110,
          timeformComment: "Quickened well inside the final furlong.",
        },
        {
          providerEntryId: `mock-entry-mock-race-004-mock-horse-005-4`,
          finishingPosition: 2,
          beatenLengths: 1.25,
          ratingAchieved: 107,
          timeformComment: "Ran on well, just held for second.",
        },
      ],
    },
  },
  // Race 5-8: future or no results yet
  {
    providerRaceId: "mock-race-005",
    postTime: RACES[4].postTime,
    result: null,
  },
  {
    providerRaceId: "mock-race-006",
    postTime: RACES[5].postTime,
    result: null,
  },
  {
    providerRaceId: "mock-race-007",
    postTime: RACES[6].postTime,
    result: null,
  },
  {
    providerRaceId: "mock-race-008",
    postTime: RACES[7].postTime,
    result: null,
  },
];

// ---------------------------------------------------------------------------
// Exported fixture shape consumed by MockRacingDataProvider
// ---------------------------------------------------------------------------

export interface MockFixtures {
  horses: MockHorseData[];
  races: MockRaceWithResult[];
}

export const mockFixtures: MockFixtures = {
  horses: HORSE_ENTRIES,
  races: RACE_DATA,
};
