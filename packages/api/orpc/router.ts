import type { RouterClient } from "@orpc/server";

import { adminRouter } from "../modules/admin/router";
import { circleRouter } from "../modules/circle/router";
import { newsRouter } from "../modules/news/router";
import { notificationsRouter } from "../modules/notifications/router";
import { organizationsRouter } from "../modules/organizations/router";
import { paymentsRouter } from "../modules/payments/router";
import { usersRouter } from "../modules/users/router";
import { publicProcedure } from "./procedures";

export const router = publicProcedure.router({
	admin: adminRouter,
	circle: circleRouter,
	news: newsRouter,
	organizations: organizationsRouter,
	users: usersRouter,
	payments: paymentsRouter,
	notifications: notificationsRouter,
});

export type ApiRouterClient = RouterClient<typeof router>;
