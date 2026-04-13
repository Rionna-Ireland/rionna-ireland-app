import { getPublishedHorse } from "./procedures/get-published-horse";
import { listPublishedHorses } from "./procedures/list-published-horses";

export const horsesPublicRouter = {
	list: listPublishedHorses,
	find: getPublishedHorse,
};
