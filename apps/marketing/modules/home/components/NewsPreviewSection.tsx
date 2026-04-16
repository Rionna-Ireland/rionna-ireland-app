import { LocaleLink } from "@i18n/routing";
import { Button } from "@repo/ui/components/button";
import { getClubNewsPosts } from "@shared/lib/club";
import { ArrowRightIcon } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

export async function NewsPreviewSection() {
	const t = await getTranslations("home.news");
	const locale = await getLocale();
	const { items } = await getClubNewsPosts({ limit: 3 });

	if (items.length === 0) {
		return null;
	}

	return (
		<section className="py-20 md:py-28 border-t">
			<div className="container">
				<div className="mb-12 flex flex-wrap items-end justify-between gap-6">
					<div className="max-w-2xl">
						<span className="font-mono text-xs tracking-[0.22em] uppercase text-foreground/70">
							{t("eyebrow")}
						</span>
						<h2 className="mt-4 font-display font-medium text-4xl md:text-5xl lg:text-6xl leading-tight text-foreground">
							{t("title")}
						</h2>
					</div>
					<Button variant="secondary" asChild>
						<LocaleLink href="/news">
							{t("viewAll")}
							<ArrowRightIcon className="ml-2 size-4" />
						</LocaleLink>
					</Button>
				</div>

				<div className="gap-6 md:grid-cols-3 grid">
					{items.map((post) => (
						<LocaleLink
							key={post.id}
							href={`/news/${post.slug}`}
							className="group block overflow-hidden rounded-3xl border bg-card hover:no-underline"
						>
							<div className="aspect-[16/10] relative overflow-hidden bg-[#DAEDF3]">
								{post.featuredImageUrl ? (
									// biome-ignore lint/a11y/useAltText: title as alt
									<img
										src={post.featuredImageUrl}
										alt={post.title}
										className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
									/>
								) : (
									<div className="absolute inset-0 flex items-center justify-center font-display text-6xl text-foreground/10">
										R
									</div>
								)}
							</div>
							<div className="p-6">
								<span className="font-mono text-[10px] tracking-[0.2em] uppercase text-foreground/60">
									{post.publishedAt
										? new Intl.DateTimeFormat(locale, {
												day: "2-digit",
												month: "short",
												year: "numeric",
											}).format(new Date(post.publishedAt))
										: ""}
								</span>
								<h3 className="mt-2 font-display font-medium text-2xl text-foreground leading-tight">
									{post.title}
								</h3>
								{post.subtitle && (
									<p className="mt-2 text-sm text-foreground/60 line-clamp-2">
										{post.subtitle}
									</p>
								)}
							</div>
						</LocaleLink>
					))}
				</div>
			</div>
		</section>
	);
}
