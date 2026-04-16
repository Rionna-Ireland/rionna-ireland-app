import { LocaleLink } from "@i18n/routing";
import { Button } from "@repo/ui/components/button";
import { ArrowRightIcon } from "lucide-react";
import { useTranslations } from "next-intl";

export function FinalCtaSection() {
	const t = useTranslations("home.finalCta");

	return (
		<section className="py-20 md:py-28">
			<div className="container">
				<div className="relative overflow-hidden rounded-[2rem] md:rounded-[2.5rem] bg-[#3A243C] text-white">
					<div className="absolute -top-24 -right-24 size-96 rounded-full bg-[#F2D6F4] blur-3xl opacity-40" />
					<div className="absolute -bottom-24 -left-24 size-96 rounded-full bg-[#CCA1D0] blur-3xl opacity-40" />

					<div className="relative px-8 py-16 md:px-16 md:py-24 lg:px-24 text-center">
						<span className="font-mono text-xs tracking-[0.22em] uppercase text-white/70">
							{t("eyebrow")}
						</span>
						<h2 className="mt-6 font-display font-medium text-4xl md:text-5xl lg:text-6xl leading-tight max-w-3xl mx-auto text-balance">
							{t("title")}
						</h2>
						<p className="mt-4 max-w-xl mx-auto text-white/80 text-lg">
							{t("description")}
						</p>
						<div className="mt-10">
							<Button size="lg" variant="primary" asChild>
								<LocaleLink href="/membership">
									{t("cta")}
									<ArrowRightIcon className="ml-2 size-4" />
								</LocaleLink>
							</Button>
						</div>
					</div>
				</div>
			</div>
		</section>
	);
}
