import { createAvatarUploadUrl } from "./procedures/create-avatar-upload-url";
import { getPreferences } from "./procedures/get-preferences";
import { updatePreferences } from "./procedures/update-preferences";

export const usersRouter = {
	avatarUploadUrl: createAvatarUploadUrl,
	getPreferences,
	updatePreferences,
};
