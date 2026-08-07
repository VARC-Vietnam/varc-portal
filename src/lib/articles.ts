import { connectDb } from "@/lib/db";
import {
  cacheAside,
  CmsCacheKeys,
  CmsCacheTags,
  hashExcludeIds,
} from "@/lib/cache/cms-cache";
import {
  DEFAULT_COVER_FOCUS,
  normalizeCoverFocus,
  type CoverFocusRect,
} from "@/lib/cover-focus";
import { excerptFromHtml, extractFirstImageUrl } from "@/lib/html";
import { notDeletedFilter } from "@/lib/soft-delete";
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
  coverImageFocus: CoverFocusRect;
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
  const coverImageUrl = resolveCardImage(article, locale, content);
  const hasExplicitCover = Boolean(article.coverImageUrl?.trim());
  return {
    id: String(article._id),
    title: content.title,
    slug: content.slug,
    excerpt: resolveCardExcerpt(content),
    publishedAt: article.publishedAt
      ? new Date(article.publishedAt).toISOString()
      : null,
    coverImageUrl,
    // Body-image fallbacks stay centered; focus only applies to uploaded covers.
    coverImageFocus: hasExplicitCover
      ? normalizeCoverFocus(article.coverImageFocus)
      : DEFAULT_COVER_FOCUS,
  };
}

function publishedLocaleFilter(locale: AppLocale, now = new Date()) {
  const key = localeKey(locale);
  return {
    ...notDeletedFilter,
    status: "published" as const,
    publishedAt: { $ne: null, $lte: now },
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
  const loc = localeKey(locale);
  const excludeHash = hashExcludeIds(options?.excludeIds);
  return cacheAside(
    CmsCacheKeys.articlesList(loc, page, pageSize, excludeHash),
    [CmsCacheTags.articles],
    async () => {
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
    },
  );
}

/**
 * Published articles explicitly marked featured (no newest-post fallback).
 */
export async function listFeaturedArticles(locale: AppLocale, limit = 3) {
  const loc = localeKey(locale);
  return cacheAside(
    CmsCacheKeys.featured(loc, limit),
    [CmsCacheTags.articles],
    async () => {
      await connectDb();
      const items = await Article.find({
        ...publishedLocaleFilter(locale),
        featured: true,
      })
        .sort({ publishedAt: -1, createdAt: -1 })
        .limit(limit)
        .lean<ArticleDocument[]>();

      return items.map((article) => toPublicCard(article, locale));
    },
  );
}

export async function getPublishedArticleBySlug(
  locale: AppLocale,
  slug: string,
) {
  const key = localeKey(locale);
  return cacheAside(
    CmsCacheKeys.articleBySlug(key, slug),
    [CmsCacheTags.articles],
    async () => {
      await connectDb();
      const now = new Date();
      return Article.findOne({
        ...notDeletedFilter,
        status: "published",
        publishedAt: { $ne: null, $lte: now },
        [`locales.${key}.slug`]: slug,
      }).lean<ArticleDocument | null>();
    },
    {
      tagsFromValue: (article) =>
        article?._id ? [CmsCacheTags.article(String(article._id))] : [],
    },
  );
}

export async function listAllArticles(options?: { trash?: boolean }) {
  await connectDb();
  const filter = options?.trash ? { deletedAt: { $ne: null } } : notDeletedFilter;
  return Article.find(filter)
    .sort(options?.trash ? { deletedAt: -1 } : { updatedAt: -1 })
    .lean<ArticleDocument[]>();
}

export async function getArticleById(id: string) {
  await connectDb();
  return Article.findById(id).lean<ArticleDocument | null>();
}

/** Any non-deleted article (draft or published) for editorial preview. */
export async function getArticleForPreview(id: string) {
  await connectDb();
  if (!mongoose.isValidObjectId(id)) return null;
  return Article.findOne({
    _id: id,
    ...notDeletedFilter,
  }).lean<ArticleDocument | null>();
}

export async function listPublishedForSitemap() {
  await connectDb();
  const now = new Date();
  return Article.find({
    ...notDeletedFilter,
    status: "published",
    publishedAt: { $ne: null, $lte: now },
  })
    .select("locales publishedAt updatedAt")
    .lean<ArticleDocument[]>();
}
