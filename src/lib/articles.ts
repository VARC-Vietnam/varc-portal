import { connectDb } from "@/lib/db";
import { excerptFromHtml, extractFirstImageUrl } from "@/lib/html";
import { Article, type ArticleDocument, type LocaleContent } from "@/models/Article";
import type { AppLocale } from "@/i18n/routing";
import mongoose from "mongoose";

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

function resolveCardImage(
  article: ArticleDocument,
  locale: AppLocale,
  content: LocaleContent,
): string {
  const cover = article.coverImageUrl?.trim() ?? "";
  if (cover) return cover;

  const fromLocale = extractFirstImageUrl(content.content);
  if (fromLocale) return fromLocale;

  // Prefer the other locale's body image when the active locale has none.
  const other = locale === "en" ? "vi" : "en";
  return extractFirstImageUrl(article.locales?.[other]?.content ?? "");
}

function resolveCardExcerpt(content: LocaleContent): string {
  const explicit = content.excerpt?.trim() ?? "";
  if (explicit) return explicit;
  return excerptFromHtml(content.content);
}

function toPublicCard(
  article: ArticleDocument,
  locale: AppLocale,
): PublicArticleCard {
  const content = getLocaleContent(article, locale);
  return {
    id: String(article._id),
    title: content.title,
    slug: content.slug,
    excerpt: resolveCardExcerpt(content),
    publishedAt: article.publishedAt
      ? new Date(article.publishedAt).toISOString()
      : null,
    coverImageUrl: resolveCardImage(article, locale, content),
  };
}

function publishedLocaleFilter(locale: AppLocale) {
  const key = localeKey(locale);
  return {
    status: "published" as const,
    [`locales.${key}.slug`]: { $nin: ["", null] },
    [`locales.${key}.title`]: { $nin: ["", null] },
  };
}

export async function listPublishedArticles(
  locale: AppLocale,
  page = 1,
  pageSize = 12,
  options?: { excludeIds?: string[] },
) {
  await connectDb();
  const filter: Record<string, unknown> = {
    ...publishedLocaleFilter(locale),
  };
  if (options?.excludeIds?.length) {
    filter._id = {
      $nin: options.excludeIds
        .filter((id) => mongoose.isValidObjectId(id))
        .map((id) => new mongoose.Types.ObjectId(id)),
    };
  }

  const [items, total] = await Promise.all([
    Article.find(filter)
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean<ArticleDocument[]>(),
    Article.countDocuments(filter),
  ]);

  return {
    articles: items.map((article) => toPublicCard(article, locale)),
    total,
    page,
    pageSize,
  };
}

/**
 * Published articles explicitly marked featured (no newest-post fallback).
 */
export async function listFeaturedArticles(locale: AppLocale, limit = 3) {
  await connectDb();
  const items = await Article.find({
    ...publishedLocaleFilter(locale),
    featured: true,
  })
    .sort({ publishedAt: -1, createdAt: -1 })
    .limit(limit)
    .lean<ArticleDocument[]>();

  return items.map((article) => toPublicCard(article, locale));
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
