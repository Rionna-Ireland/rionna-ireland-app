import { createOrg } from "./procedures/create-org";
import { getOrgDetail } from "./procedures/get-org-detail";
import { inviteAdmin } from "./procedures/invite-admin";
import { listOrgs } from "./procedures/list-orgs";
import { removeAdmin } from "./procedures/remove-admin";

export const platformRouter = {
	listOrgs,
	getOrgDetail,
	createOrg,
	inviteAdmin,
	removeAdmin,
};
