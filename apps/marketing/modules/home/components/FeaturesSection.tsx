import { BellIcon, MessageCircleIcon, SparklesIcon, TrophyIcon } from "lucide-react";
import { useTranslations } from "next-intl";

const FEATURE_KEYS = ["stables", "pulse", "community", "alerts"] as const;

const FEATURE_ICONS = {
	stables: TrophyIcon,
	pulse: SparklesIcon,
	community: MessageCircleIcon,
	alerts: BellIcon,
} satisfies Record<(typeof FEATURE_KEYS)[number], typeof SparklesIcon>;

export function FeaturesSection() {
	const t = useTranslations("home.features");

	return (
		<section id="features" className="py-20 md:py-28">
			<div className="container">
				<div className="max-w-3xl mb-16">
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

				<div className="gap-4 md:grid-cols-2 grid">
					{FEATURE_KEYS.map((key, idx) => {
						const Icon = FEATURE_ICONS[key];
						const bgColors = [
							"bg-[#DAEDF3] dark:bg-[#374B6C]",
							"bg-[#F2D6F4] dark:bg-[#57385A]",
							"bg-[#D4DCCE] dark:bg-[#043F29]",
							"bg-[#EEEADF] dark:bg-[#172741]",
						];
						return (
							<div
								key={key}
								className={`relative overflow-hidden rounded-3xl p-8 md:p-10 ${bgColors[idx]}`}
							>
								<div className="absolute -top-8 -right-8 size-40 rounded-full bg-background/40 blur-2xl" />
								<div className="relative">
									<Icon className="size-8 text-foreground/80" />
									<h3 className="mt-6 font-display font-medium text-2xl md:text-3xl text-foreground">
										{t(`${key}.title`)}
									</h3>
									<p className="mt-3 text-foreground/70">{t(`${key}.description`)}</p>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
}
