import { config } from "@config";
import { LocaleLink } from "@i18n/routing";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function HeroSection() {
	const t = useTranslations("home.hero");

	return (
		<section className="relative overflow-hidden">
			<div className="absolute -top-32 -left-32 size-[520px] rounded-full bg-[#F2D6F4] blur-3xl opacity-70 dark:opacity-30" />
			<div className="absolute -bottom-32 -right-32 size-[460px] rounded-full bg-[#DAEDF3] blur-3xl opacity-70 dark:opacity-30" />

			<div className="container relative z-10 py-20 md:py-28 lg:py-36">
				<div className="max-w-4xl">
					<span className="font-mono text-xs tracking-[0.22em] uppercase text-foreground/70">
						{t("eyebrow")}
					</span>
					<h1 className="mt-6 font-display font-medium text-5xl md:text-6xl lg:text-7xl xl:text-8xl leading-[0.95] text-foreground text-balance">
						{t("title")}
					</h1>
					<p className="mt-6 max-w-2xl text-lg md:text-xl text-foreground/70 leading-relaxed">
						{t("subtitle")}
					</p>
					<div className="mt-10 flex flex-wrap gap-3">
						<Button size="lg" variant="primary" asChild>
							<LocaleLink href="/membership">
								{t("joinCta")}
								<ArrowRightIcon className="ml-2 size-4" />
							</LocaleLink>
						</Button>
						<Button size="lg" variant="ghost" asChild>
							<LocaleLink href="/about">{t("learnMoreCta")}</LocaleLink>
						</Button>
					</div>

					{config.saasUrl && (
						<p className="mt-8 font-mono text-xs tracking-[0.18em] uppercase text-foreground/50">
							{t("membersNote")}{" "}
							<a
								href={config.saasUrl}
								className="underline underline-offset-4 hover:text-foreground"
							>
								{t("signInLink")}
							</a>
						</p>
					)}
				</div>
			</div>
		</section>
	);
}
