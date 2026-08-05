import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getLocaleContent,
  getPublishedArticleBySlug,
  hasLocaleContent,
} from "@/lib/articles";
import { getPublicSiteBranding } from "@/lib/cms";
import type { AppLocale } from "@/i18n/routing";
import { HtmlContent } from "@/components/portal/html-content";
import { coverFocusObjectPosition, normalizeCoverFocus } from "@/lib/cover-focus";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as AppLocale;
  const article = await getPublishedArticleBySlug(locale, slug);
  if (!article) return { title: "Not found" };

  const content = getLocaleContent(article, locale);
  const branding = await getPublicSiteBranding(locale);
  const pageName = content.metaTitle || content.title;
  const documentTitle = `${pageName} - ${branding.siteName} | ${branding.siteTitle}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3099";
  const path = `/${locale}/news/${content.slug}`;
  const en = getLocaleContent(article, "en");
  const vi = getLocaleContent(article, "vi");

  return {
    title: pageName,
    description: content.metaDescription || content.excerpt,
    alternates: {
      canonical: `${siteUrl}${path}`,
      languages: {
        vi: vi.slug ? `${siteUrl}/vi/news/${vi.slug}` : undefined,
        en: en.slug ? `${siteUrl}/en/news/${en.slug}` : undefined,
        "x-default": vi.slug ? `${siteUrl}/vi/news/${vi.slug}` : undefined,
      },
    },
    keywords: article.tags?.length ? article.tags.join(", ") : undefined,
    openGraph: {
      title: documentTitle,
      description: content.metaDescription || content.excerpt,
      url: `${siteUrl}${path}`,
      type: "article",
      images: article.ogImageUrl || article.coverImageUrl || undefined,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);

  const t = await getTranslations("article");
  const article = await getPublishedArticleBySlug(locale, slug);
  if (!article || !hasLocaleContent(article, locale)) {
    notFound();
  }

  const content = getLocaleContent(article, locale);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3099";
  const path = `/${locale}/news/${content.slug}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    headline: content.title,
    description: content.excerpt,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: locale,
    image: article.coverImageUrl || undefined,
    mainEntityOfPage: `${siteUrl}${path}`,
  };

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link href="/" className="text-sm text-accent hover:underline">
        {t("backToNews")}
      </Link>
      <header className="mt-6 border-b border-border pb-8">
        <h1 className="font-display text-4xl leading-tight text-foreground md:text-5xl">
          {content.title}
        </h1>
        {article.publishedAt ? (
          <time
            dateTime={new Date(article.publishedAt).toISOString()}
            className="mt-4 block text-sm text-muted"
          >
            {new Date(article.publishedAt).toLocaleDateString(
              locale === "vi" ? "vi-VN" : "en-GB",
              { year: "numeric", month: "long", day: "numeric" },
            )}
          </time>
        ) : null}
        {content.excerpt ? (
          <p className="mt-4 text-lg text-muted">{content.excerpt}</p>
        ) : null}
        {article.tags?.length ? (
          <ul className="mt-5 flex flex-wrap gap-2">
            {article.tags.map((tag) => (
              <li
                key={tag}
                className="rounded border border-border px-2.5 py-1 text-xs text-muted"
              >
                {tag}
              </li>
            ))}
          </ul>
        ) : null}
      </header>
      {article.coverImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={article.coverImageUrl}
          alt=""
          className="mt-8 aspect-[16/9] w-full object-cover"
          style={{
            objectPosition: coverFocusObjectPosition(
              normalizeCoverFocus(article.coverImageFocus),
            ),
          }}
        />
      ) : null}
      <HtmlContent html={content.content} />
    </article>
  );
}
