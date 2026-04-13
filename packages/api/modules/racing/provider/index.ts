/**
 * Racing Data Provider factory
 *
 * Returns the correct RacingDataProvider implementation based on the
 * provider name stored in Organization.metadata.racing.provider.
 *
 * @see Architecture/specs/S1-03-racing-data-provider.md
 */

import type { RacingDataProvider } from "./types";
import { MockRacingDataProvider } from "./mock";
import { ManualProvider } from "./manual";
// import { TimeformProvider } from "./timeform";     // future
// import { RacingAPIProvider } from "./racing-api";   // future

export type ProviderName = "mock" | "timeform" | "racing_api" | "manual";

export function createRacingProvider(
  providerName: ProviderName,
): RacingDataProvider {
  switch (providerName) {
    case "mock":
      return new MockRacingDataProvider();
    case "manual":
      return new ManualProvider();
    // case "timeform":
    //   return new TimeformProvider(apiKey);
    // case "racing_api":
    //   return new RacingAPIProvider(apiKey);
    default:
      return new ManualProvider();
  }
}

export type {
  RacingDataProvider,
  ProviderEntry,
  ProviderResult,
  ProviderHorse,
} from "./types";
export { MockRacingDataProvider } from "./mock";
export { ManualProvider } from "./manual";
