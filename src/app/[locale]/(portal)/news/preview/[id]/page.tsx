import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import {
  getArticleForPreview,
  getLocaleContent,
  hasLocaleContent,
} from "@/lib/articles";
import { requireEditorialPage } from "@/lib/admin-access";
import type { AppLocale } from "@/i18n/routing";
import { ArticleBody } from "@/components/portal/article-body";
import { formatDateUtc7 } from "@/lib/datetime-local";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam, id } = await params;
  const locale = localeParam as AppLocale;
  await requireEditorialPage();
  const article = await getArticleForPreview(id);
  if (!article) return { title: "Preview not found", robots: { index: false } };

  const content = getLocaleContent(article, locale);
  return {
    title: `Preview: ${content.title || "Untitled"}`,
    robots: { index: false, follow: false },
  };
}

export default async function ArticlePreviewPage({ params }: Props) {
  await requireEditorialPage();

  const { locale: localeParam, id } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);

  const t = await getTranslations("article");
  const article = await getArticleForPreview(id);
  if (!article) {
    notFound();
  }

  const content = getLocaleContent(article, locale);
  const isDraft = article.status !== "published";
  const ready = hasLocaleContent(article, locale);

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <p>
          <span className="font-semibold">Preview</span>
          {" — "}
          {isDraft
            ? "Draft (not published). This page is only visible to editors."
            : "Published version as currently saved."}{" "}
          Locale: {locale.toUpperCase()}.
        </p>
        <a
          href={`/admin/articles/${id}`}
          className="shrink-0 font-medium underline-offset-2 hover:underline"
        >
          Back to editor
        </a>
      </div>

      {!ready ? (
        <p className="rounded-lg border border-border bg-surface px-4 py-8 text-muted">
          This locale has no saved title/slug yet. Add content and save, then
          preview again.
        </p>
      ) : (
        <>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-accent transition hover:underline"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M15 18 9 12l6-6" />
            </svg>
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
                {formatDateUtc7(
                  article.publishedAt,
                  locale === "vi" ? "vi-VN" : "en-GB",
                  { month: "long" },
                )}
              </time>
            ) : (
              <p className="mt-4 text-sm text-muted">Not published yet</p>
            )}
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
          {article.coverImageUrl || content.content ? (
            <ArticleBody
              html={content.content}
              title={content.title}
              coverImageUrl={article.coverImageUrl || undefined}
              coverImageFocus={article.coverImageFocus}
            />
          ) : null}
        </>
      )}
    </article>
  );
}
