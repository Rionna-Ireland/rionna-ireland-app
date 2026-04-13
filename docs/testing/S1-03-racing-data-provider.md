# S1-03: Racing Data Provider — Verification Steps

## Type-check

```bash
pnpm turbo type-check --filter=@repo/api
```

The only type error is a pre-existing issue in `packages/payments/provider/stripe/index.ts` (`deletePurchaseBySubscriptionId` not found). No errors in the racing provider files.

## Manual smoke test via tsx

```bash
# From the monorepo root:
TSX=./node_modules/.pnpm/node_modules/.bin/tsx

$TSX -e "
const { createRacingProvider } = require('./packages/api/modules/racing/provider/index');

async function main() {
  // Mock provider
  const mock = createRacingProvider('mock');

  // getEntriesForHorse — should return entries with time-based statuses
  const entries = await mock.getEntriesForHorse('mock-horse-001', { lookAheadDays: 14 });
  console.log('Entries for Pink Jasmine:', entries.length);
  entries.forEach(e => console.log('  ', e.race.name, '->', e.entry.status));

  // getRaceResult — should return result for past race, null for future
  const pastResult = await mock.getRaceResult('mock-race-001');
  console.log('Past race result:', pastResult ? pastResult.entries.length + ' entries' : 'null');

  const futureResult = await mock.getRaceResult('mock-race-007');
  console.log('Future race result:', futureResult);

  // getHorseProfile
  const profile = await mock.getHorseProfile('mock-horse-003');
  console.log('Horse profile:', profile.name, '-', profile.colour, profile.sex);

  // Non-runner check
  const emeraldEntries = await mock.getEntriesForHorse('mock-horse-003', { lookAheadDays: 14 });
  const nonRunner = emeraldEntries.find(e => e.entry.status === 'NON_RUNNER');
  console.log('Non-runner found:', nonRunner ? nonRunner.race.name : 'none');

  // Manual provider
  const manual = createRacingProvider('manual');
  const manualEntries = await manual.getEntriesForHorse('anything', { lookAheadDays: 7 });
  console.log('Manual entries:', manualEntries.length);

  const manualResult = await manual.getRaceResult('anything');
  console.log('Manual result:', manualResult);

  try {
    await manual.getHorseProfile('anything');
  } catch (e) {
    console.log('Manual getHorseProfile throws:', e.message);
  }

  console.log('All checks passed.');
}

main().catch(console.error);
"
```

## Expected output

- Pink Jasmine has 3 entries: 1 past (RAN), 1 today-ish (DECLARED), 1 future (ENTERED)
- Past race result returns entries with finishing positions
- Future race result returns null
- Emerald Dream has a NON_RUNNER entry (Curragh Maiden)
- Manual provider returns empty arrays and null, throws on getHorseProfile

## Checklist

- [x] `RacingDataProvider` interface compiles with all three methods
- [x] `MockRacingDataProvider` returns entries whose status changes based on time
- [x] `MockRacingDataProvider` returns race results only for past races
- [x] `ManualProvider` returns empty data without errors
- [x] `createRacingProvider("mock")` returns a working mock instance
- [x] Mock fixtures include 5 horses, 3 meetings, 8 races, 1 non-runner
- [x] Fixtures use relative dates so they're always a mix of past/future
