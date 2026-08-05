import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { listPublishedArticles } from "@/lib/articles";
import { getPublicSiteBranding } from "@/lib/cms";
import type { AppLocale } from "@/i18n/routing";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const [branding, articlesResult] = await Promise.all([
    getPublicSiteBranding(locale),
    listPublishedArticles(locale),
  ]);
  const { articles } = articlesResult;

  return (
    <div>
      <section className="relative overflow-hidden border-b border-border bg-[radial-gradient(circle_at_top_left,#d8ebe1_0%,transparent_45%),linear-gradient(180deg,#f4f7f5_0%,#eef3f0_100%)]">
        <div className="mx-auto flex min-h-[52vh] max-w-6xl flex-col justify-end px-4 pb-14 pt-20 md:px-6">
          <p className="font-display text-5xl tracking-tight text-accent md:text-7xl">
            {branding.siteName}
          </p>
          <h1 className="mt-4 max-w-2xl font-display text-3xl leading-tight text-foreground md:text-5xl">
            {branding.siteTitle}
          </h1>
          <p className="mt-4 max-w-[40ch] text-base leading-relaxed text-muted md:text-lg">
            {branding.tagline}
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16 md:px-6">
        <h2 className="font-display text-3xl text-foreground md:text-4xl">
          {t("title")}
        </h2>

        {articles.length === 0 ? (
          <p className="mt-8 text-muted">{t("empty")}</p>
        ) : (
          <ul className="mt-10 divide-y divide-border border-t border-border">
            {articles.map((article) => (
              <li key={article.id} className="py-8">
                <Link
                  href={{
                    pathname: "/news/[slug]",
                    params: { slug: article.slug },
                  }}
                  className="group block"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-baseline md:justify-between">
                    <h3 className="max-w-3xl font-display text-2xl text-foreground transition group-hover:text-accent md:text-3xl">
                      {article.title}
                    </h3>
                    {article.publishedAt ? (
                      <time
                        dateTime={article.publishedAt}
                        className="shrink-0 text-sm text-muted"
                      >
                        {t("publishedAt")}{" "}
                        {new Date(article.publishedAt).toLocaleDateString(
                          locale === "vi" ? "vi-VN" : "en-GB",
                          { year: "numeric", month: "short", day: "numeric" },
                        )}
                      </time>
                    ) : null}
                  </div>
                  {article.excerpt ? (
                    <p className="mt-3 max-w-[65ch] text-muted">{article.excerpt}</p>
                  ) : null}
                  <span className="mt-4 inline-block text-sm font-medium text-accent">
                    {t("readMore")}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
