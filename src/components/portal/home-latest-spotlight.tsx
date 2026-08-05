import { ArticleCard } from "@/components/portal/article-card";
import { Reveal } from "@/components/portal/reveal";
import type { PublicArticleCard } from "@/lib/articles";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  articles: PublicArticleCard[];
  locale: AppLocale;
  labels: {
    title: string;
    readMore: string;
    publishedAt: string;
  };
};

/** One lead story + up to three supporting latest posts. */
export function HomeLatestSpotlight({ articles, locale, labels }: Props) {
  if (articles.length === 0) return null;

  const [lead, ...side] = articles.slice(0, 4);

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="font-display text-3xl text-foreground md:text-4xl">
            {labels.title}
          </h2>
        </Reveal>

        <div className="mt-10 grid gap-10 lg:mt-14 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] lg:items-start lg:gap-12">
          <Reveal>
            <ArticleCard
              article={lead}
              locale={locale}
              variant="lead"
              labels={labels}
            />
          </Reveal>

          {side.length > 0 ? (
            <div className="flex flex-col gap-8 border-t border-border pt-8 lg:border-t-0 lg:border-l lg:pt-0 lg:pl-12">
              {side.map((article, index) => (
                <Reveal key={article.id} delayMs={100 + index * 80}>
                  <ArticleCard
                    article={article}
                    locale={locale}
                    variant="support"
                    labels={labels}
                  />
                </Reveal>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
