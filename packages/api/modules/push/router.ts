import { registerPushToken } from "./procedures/register-token";
import { unregisterPushToken } from "./procedures/unregister-token";

export const pushRouter = {
	registerToken: registerPushToken,
	unregisterToken: unregisterPushToken,
};
