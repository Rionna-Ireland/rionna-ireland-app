import { LocaleLink } from "@i18n/routing";
import { Button } from "@repo/ui/components/button";
import { getClubHorses } from "@shared/lib/club";
import { getTranslations } from "next-intl/server";

type HorsePhoto = { url: string; caption?: string };

function firstPhotoUrl(photos: unknown): string | null {
	if (!Array.isArray(photos) || photos.length === 0) return null;
	const first = photos[0] as HorsePhoto | string | undefined;
	if (!first) return null;
	if (typeof first === "string") return first;
	return first.url ?? null;
}

const STATUS_LABELS: Record<string, string> = {
	PRE_TRAINING: "Pre-training",
	IN_TRAINING: "In training",
	REHAB: "Rehab",
	RETIRED: "Retired",
	SOLD: "Sold",
};

export async function HorsePreviewSection() {
	const t = await getTranslations("home.horses");
	const allHorses = await getClubHorses();
	const horses = allHorses.slice(0, 4);

	if (horses.length === 0) {
		return null;
	}

	return (
		<section className="py-20 md:py-28 bg-[#EEEADF] dark:bg-[#172741]">
			<div className="container">
				<div className="max-w-3xl mb-12">
					<span className="font-mono text-xs tracking-[0.22em] uppercase text-foreground/70">
						{t("eyebrow")}
					</span>
					<h2 className="mt-4 font-display font-medium text-4xl md:text-5xl lg:text-6xl leading-tight text-foreground">
						{t("title")}
					</h2>
					<p className="mt-4 text-base md:text-lg text-foreground/70">
						{t("description")}
					</p>
				</div>

				<div className="gap-6 md:grid-cols-2 lg:grid-cols-4 grid">
					{horses.map((horse) => {
						const photoUrl = firstPhotoUrl(horse.photos);
						return (
							<div
								key={horse.id}
								className="group overflow-hidden rounded-3xl bg-background"
							>
								<div className="aspect-[4/5] relative overflow-hidden bg-[#D4DCCE]">
									{photoUrl ? (
										// biome-ignore lint/a11y/useAltText: horse name as alt
										<img
											src={photoUrl}
											alt={horse.name}
											className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
										/>
									) : (
										<div className="absolute inset-0 flex items-center justify-center font-display text-6xl text-foreground/10">
											{horse.name.charAt(0)}
										</div>
									)}
								</div>
								<div className="p-5">
									<span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/60">
										{STATUS_LABELS[horse.status] ?? horse.status}
									</span>
									<h3 className="mt-1 font-display font-medium text-2xl text-foreground">
										{horse.name}
									</h3>
									{horse.trainer?.name && (
										<p className="mt-1 text-sm text-foreground/60">
											{t("trainerLabel", { name: horse.trainer.name })}
										</p>
									)}
								</div>
							</div>
						);
					})}
				</div>

				<div className="mt-12 flex justify-center">
					<Button variant="secondary" size="lg" asChild>
						<LocaleLink href="/membership">{t("ctaMembership")}</LocaleLink>
					</Button>
				</div>
			</div>
		</section>
	);
}
