import { createLogoUploadUrl } from "./procedures/create-logo-upload-url";
import { generateOrganizationSlug } from "./procedures/generate-organization-slug";
import { verifyMembership } from "./procedures/verify-membership";

export const organizationsRouter = {
	generateSlug: generateOrganizationSlug,
	createLogoUploadUrl,
	verifyMembership,
};
