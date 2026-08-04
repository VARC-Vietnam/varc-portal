import { connectDb } from "@/lib/db";
import { Article, type ArticleDocument, type LocaleContent } from "@/models/Article";
import type { AppLocale } from "@/i18n/routing";

export type PublicArticleCard = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  publishedAt: string | null;
  coverImageUrl: string;
};

function localeKey(locale: AppLocale): "vi" | "en" {
  return locale === "en" ? "en" : "vi";
}

export function getLocaleContent(
  article: ArticleDocument,
  locale: AppLocale,
): LocaleContent {
  const key = localeKey(locale);
  const content = article.locales?.[key];
  return {
    title: content?.title ?? "",
    slug: content?.slug ?? "",
    excerpt: content?.excerpt ?? "",
    content: content?.content ?? "",
    metaTitle: content?.metaTitle ?? "",
    metaDescription: content?.metaDescription ?? "",
  };
}

export function hasLocaleContent(
  article: ArticleDocument,
  locale: AppLocale,
): boolean {
  const content = getLocaleContent(article, locale);
  return Boolean(content.slug && content.title);
}

export async function listPublishedArticles(
  locale: AppLocale,
  page = 1,
  pageSize = 12,
) {
  await connectDb();
  const key = localeKey(locale);
  const filter = {
    status: "published" as const,
    [`locales.${key}.slug`]: { $nin: ["", null] },
    [`locales.${key}.title`]: { $nin: ["", null] },
  };

  const [items, total] = await Promise.all([
    Article.find(filter as Record<string, unknown>)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<ArticleDocument[]>(),
    Article.countDocuments(filter as Record<string, unknown>),
  ]);

  const articles: PublicArticleCard[] = items.map((article) => {
    const content = getLocaleContent(article, locale);
    return {
      id: String(article._id),
      title: content.title,
      slug: content.slug,
      excerpt: content.excerpt,
      publishedAt: article.publishedAt
        ? new Date(article.publishedAt).toISOString()
        : null,
      coverImageUrl: article.coverImageUrl ?? "",
    };
  });

  return { articles, total, page, pageSize };
}

export async function getPublishedArticleBySlug(
  locale: AppLocale,
  slug: string,
) {
  await connectDb();
  const key = localeKey(locale);
  const article = await Article.findOne({
    status: "published",
    [`locales.${key}.slug`]: slug,
  }).lean<ArticleDocument | null>();

  return article;
}

export async function listAllArticles() {
  await connectDb();
  return Article.find()
    .sort({ updatedAt: -1 })
    .lean<ArticleDocument[]>();
}

export async function getArticleById(id: string) {
  await connectDb();
  return Article.findById(id).lean<ArticleDocument | null>();
}

export async function listPublishedForSitemap() {
  await connectDb();
  return Article.find({ status: "published" })
    .select("locales publishedAt updatedAt")
    .lean<ArticleDocument[]>();
}
