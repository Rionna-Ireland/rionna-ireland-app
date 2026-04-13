import { createBrandUploadUrl } from "./procedures/create-brand-upload-url";
import { getClubSettings } from "./procedures/get-club-settings";
import { updateClubSettings } from "./procedures/update-club-settings";

export const settingsRouter = {
	get: getClubSettings,
	update: updateClubSettings,
	createBrandUploadUrl: createBrandUploadUrl,
};
