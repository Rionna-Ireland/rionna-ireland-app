import { HorseForm } from "@admin/component/horses/HorseForm";
import { getAdminPath } from "@admin/lib/links";
import { Button } from "@repo/ui";
import { ArrowLeftIcon } from "lucide-react";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function NewHorsePage() {
	const t = await getTranslations("admin.horses");

	return (
		<div>
			<div className="mb-2 flex justify-start">
				<Button variant="link" size="sm" asChild className="px-0">
					<Link href={getAdminPath("/horses")}>
						<ArrowLeftIcon className="mr-1.5 size-4" />
						{t("backToList")}
					</Link>
				</Button>
			</div>
			<HorseForm />
		</div>
	);
}
