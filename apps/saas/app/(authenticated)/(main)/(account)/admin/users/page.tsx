import { getSession } from "@auth/lib/server";
import { InviteMemberForm } from "@organizations/components/InviteMemberForm";
import { OrganizationMembersBlock } from "@organizations/components/OrganizationMembersBlock";
import { SettingsList } from "@shared/components/SettingsList";
import { getTranslations } from "next-intl/server";
import { redirect } from "next/navigation";

export default async function AdminUserPage() {
	const session = await getSession();
	const t = await getTranslations("admin.users");

	const activeOrganizationId = session?.session.activeOrganizationId;

	// /admin is per-org; without an active org there's nothing to moderate.
	// Platform admins land here only after impersonating an org (sets activeOrganizationId).
	if (!activeOrganizationId) {
		redirect("/");
	}

	return (
		<div>
			<h2 className="mb-4 font-semibold text-2xl">{t("title")}</h2>
			<SettingsList>
				<InviteMemberForm organizationId={activeOrganizationId} />
				<OrganizationMembersBlock organizationId={activeOrganizationId} />
			</SettingsList>
		</div>
	);
}
