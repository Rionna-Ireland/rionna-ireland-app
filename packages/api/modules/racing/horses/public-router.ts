import { getLatestResultsProcedure } from "./procedures/get-latest-results";
import { getNextRunProcedure } from "./procedures/get-next-run";
import { getPublishedHorse } from "./procedures/get-published-horse";
import { listPublishedHorses } from "./procedures/list-published-horses";

export const horsesPublicRouter = {
	list: listPublishedHorses,
	find: getPublishedHorse,
	nextRun: getNextRunProcedure,
	latestResults: getLatestResultsProcedure,
};
