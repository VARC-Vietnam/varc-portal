import { ArticleCard } from "@/components/portal/article-card";
import { Reveal } from "@/components/portal/reveal";
import type { PublicArticleCard } from "@/lib/articles";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  articles: PublicArticleCard[];
  locale: AppLocale;
  labels: {
    title: string;
    empty: string;
    readMore: string;
    publishedAt: string;
  };
};

export function HomeLatest({ articles, locale, labels }: Props) {
  return (
    <section className="bg-background">
      <div className="mx-auto max-w-6xl px-4 py-16 md:px-6 md:py-24">
        <Reveal>
          <h2 className="font-display text-3xl text-foreground md:text-4xl">
            {labels.title}
          </h2>
        </Reveal>

        {articles.length === 0 ? (
          <p className="mt-8 text-muted">{labels.empty}</p>
        ) : (
          <ul className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:mt-14 lg:grid-cols-3">
            {articles.map((article, index) => (
              <li key={article.id}>
                <Reveal delayMs={Math.min(index * 70, 210)}>
                  <ArticleCard
                    article={article}
                    locale={locale}
                    variant="grid"
                    labels={labels}
                  />
                </Reveal>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
