import mongoose from "mongoose";
import {
  getLocaleContent,
  listFeaturedArticles,
  listPublishedArticles,
  type PublicArticleCard,
} from "@/lib/articles";
import {
  DEFAULT_COVER_FOCUS,
  normalizeCoverFocus,
} from "@/lib/cover-focus";
import {
  getCategoryLocale,
  listCategories,
  listPublicMenuLinks,
  type PublicMenuLink,
} from "@/lib/cms";
import { excerptFromHtml, extractFirstImageUrl, sanitizeHtml } from "@/lib/html";
import { notDeletedFilter } from "@/lib/soft-delete";
import type { AppLocale } from "@/i18n/routing";
import { Article, type ArticleDocument } from "@/models/Article";
import type { PageDocument, PageGalleryItem } from "@/models/Page";
import {
  resolveBlockLocaleHtml,
  resolveBlockLocaleText,
  type BlockSource,
  type TemplateBlock,
  type TemplateLayout,
} from "@/lib/blocks/types";

export type BlockPageContext = {
  title: string;
  contentHtml: string;
  galleryItems: PageGalleryItem[];
};

export type ResolvedCategoryCard = {
  id: string;
  name: string;
  slug: string;
  description: string;
};

export type ResolvedBlockData = {
  html?: string;
  text?: string;
  href?: string;
  imageUrl?: string;
  imageAlt?: string;
  galleryItems?: Array<{ id: string; url: string; alt: string }>;
  articles?: PublicArticleCard[];
  article?: PublicArticleCard | null;
  categories?: ResolvedCategoryCard[];
  menuLinks?: PublicMenuLink[];
  spacerHeight?: number;
  /** Section title from block locales (article lists, etc.). */
  sectionTitle?: string;
};

export function settingNumber(
  settings: Record<string, unknown>,
  key: string,
  fallback: number,
) {
  const value = settings[key];
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function settingBool(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return value === true || value === "true" || value === 1;
}

export function settingString(settings: Record<string, unknown>, key: string) {
  const value = settings[key];
  return typeof value === "string" ? value : "";
}

/** Default true unless explicitly disabled. */
export function settingBoolDefaultTrue(
  settings: Record<string, unknown>,
  key: string,
) {
  const value = settings[key];
  if (value === false || value === "false" || value === 0) return false;
  if (value === true || value === "true" || value === 1) return true;
  return true;
}

function articleToCard(article: ArticleDocument, locale: AppLocale): PublicArticleCard {
  const content = getLocaleContent(article, locale);
  const cover = article.coverImageUrl?.trim() ?? "";
  const coverImageUrl =
    cover ||
    extractFirstImageUrl(content.content) ||
    extractFirstImageUrl(
      getLocaleContent(article, locale === "en" ? "vi" : "en").content,
    );
  return {
    id: String(article._id),
    title: content.title,
    slug: content.slug,
    excerpt: content.excerpt?.trim() || excerptFromHtml(content.content),
    publishedAt: article.publishedAt
      ? new Date(article.publishedAt).toISOString()
      : null,
    coverImageUrl,
    coverImageFocus: cover
      ? normalizeCoverFocus(article.coverImageFocus)
      : DEFAULT_COVER_FOCUS,
  };
}

function toObjectIds(ids: string[]): mongoose.Types.ObjectId[] {
  return ids
    .filter((id) => mongoose.isValidObjectId(id))
    .map((id) => new mongoose.Types.ObjectId(id));
}

function applyShowExcerpt(
  articles: PublicArticleCard[],
  showExcerpt: boolean,
): PublicArticleCard[] {
  if (showExcerpt) return articles;
  return articles.map((article) => ({ ...article, excerpt: "" }));
}

async function resolveArticlesFromSource(
  source: BlockSource,
  settings: Record<string, unknown>,
  locale: AppLocale,
  contextCategoryIds?: string[],
): Promise<PublicArticleCard[]> {
  const limit = Math.min(Math.max(settingNumber(settings, "limit", 6), 1), 48);
  const mode = source.mode ?? "latest";
  const showExcerpt = settingBoolDefaultTrue(settings, "showExcerpt");
  const localeKey = locale === "en" ? "en" : "vi";

  let articles: PublicArticleCard[] = [];

  if (mode === "featured") {
    articles = await listFeaturedArticles(locale, limit);
  } else if (mode === "ids") {
    const ids = (source.articleIds ?? []).filter((id) =>
      mongoose.isValidObjectId(id),
    );
    if (ids.length) {
      const docs = await Article.find({
        _id: { $in: toObjectIds(ids) },
        ...notDeletedFilter,
        status: "published",
        publishedAt: { $ne: null, $lte: new Date() },
        [`locales.${localeKey}.slug`]: { $nin: ["", null] },
        [`locales.${localeKey}.title`]: { $nin: ["", null] },
      }).lean<ArticleDocument[]>();
      const byId = new Map(docs.map((doc) => [String(doc._id), doc]));
      articles = ids
        .map((id) => byId.get(id))
        .filter((doc): doc is ArticleDocument => Boolean(doc))
        .map((doc) => articleToCard(doc, locale))
        .slice(0, limit);
    }
  } else if (mode === "category") {
    const categoryIds = (
      source.categoryIds?.length
        ? source.categoryIds
        : contextCategoryIds ?? []
    ).filter((id) => mongoose.isValidObjectId(id));
    if (categoryIds.length) {
      const objectIds = toObjectIds(categoryIds);
      const docs = await Article.find({
        ...notDeletedFilter,
        status: "published",
        publishedAt: { $ne: null, $lte: new Date() },
        categoryIds: { $in: objectIds },
        [`locales.${localeKey}.slug`]: { $nin: ["", null] },
        [`locales.${localeKey}.title`]: { $nin: ["", null] },
      })
        .sort({ publishedAt: -1 })
        .limit(limit)
        .lean<ArticleDocument[]>();
      articles = docs.map((doc) => articleToCard(doc, locale));
    }
  } else {
    const listed = await listPublishedArticles(locale, 1, limit);
    articles = listed.articles;
  }

  return applyShowExcerpt(articles, showExcerpt);
}

export function pageContextFromPage(
  page: PageDocument,
  locale: AppLocale,
): BlockPageContext {
  const preferred = locale === "en" ? "en" : "vi";
  const fallback = preferred === "en" ? "vi" : "en";
  const primary = page.locales?.[preferred];
  const secondary = page.locales?.[fallback];
  return {
    title: primary?.title?.trim() || secondary?.title?.trim() || "",
    contentHtml: primary?.content?.trim()
      ? primary.content
      : secondary?.content ?? "",
    galleryItems: page.galleryItems ?? [],
  };
}

export async function resolveBlock(
  block: TemplateBlock,
  locale: AppLocale,
  page: BlockPageContext,
  options?: { categoryIds?: string[] },
): Promise<ResolvedBlockData> {
  const source = block.source ?? {};
  const settings = block.settings ?? {};
  const type = block.type;
  const contentLocale = locale === "en" ? "en" : "vi";

  switch (type) {
    case "richText":
    case "html":
      return {
        html: sanitizeHtml(resolveBlockLocaleHtml(source, contentLocale)),
      };
    case "pageContent":
      return { html: sanitizeHtml(page.contentHtml) };
    case "heading": {
      const bindTitle = settingBool(settings, "bindPageTitle");
      const localized = resolveBlockLocaleText(source, contentLocale);
      const text = bindTitle
        ? page.title
        : localized.text.replaceAll("{{page.title}}", page.title);
      return { text, href: localized.href || undefined };
    }
    case "image":
      return {
        imageUrl: source.url ?? "",
        imageAlt: source.alt ?? "",
      };
    case "gallery": {
      const usePageGallery = settingBool(settings, "usePageGallery");
      const items = usePageGallery
        ? page.galleryItems
        : (source.galleryItems ?? []);
      return {
        galleryItems: items
          .filter((item) => item?.url)
          .map((item, index) => ({
            id: String(item.mediaId || item.url || index),
            url: String(item.url),
            alt: String(item.alt || item.originalName || ""),
          })),
      };
    }
    case "articleList": {
      const articles = await resolveArticlesFromSource(
        source,
        settings,
        locale,
        options?.categoryIds,
      );
      const sectionTitle = resolveBlockLocaleText(source, contentLocale).text;
      return { articles, sectionTitle };
    }
    case "featuredSlider":
      return {
        articles: await resolveArticlesFromSource(
          { ...source, mode: source.mode ?? "featured" },
          { ...settings, limit: settings.limit ?? 3 },
          locale,
          options?.categoryIds,
        ),
      };
    case "articleCard": {
      if (!source.articleId || !mongoose.isValidObjectId(source.articleId)) {
        return { article: null };
      }
      const localeKey = locale === "en" ? "en" : "vi";
      const doc = await Article.findOne({
        _id: source.articleId,
        ...notDeletedFilter,
        status: "published",
        publishedAt: { $ne: null, $lte: new Date() },
        [`locales.${localeKey}.slug`]: { $nin: ["", null] },
        [`locales.${localeKey}.title`]: { $nin: ["", null] },
      }).lean<ArticleDocument | null>();
      if (!doc) return { article: null };
      const showExcerpt = settingBoolDefaultTrue(settings, "showExcerpt");
      const card = articleToCard(doc, locale);
      return {
        article: showExcerpt ? card : { ...card, excerpt: "" },
      };
    }
    case "categoryList": {
      const all = await listCategories();
      const selected = (source.categoryIds ?? []).map(String).filter(Boolean);
      const wanted = selected.length
        ? new Set(selected)
        : new Set(all.map((c) => String(c._id)));
      const categories = all
        .filter((c) => wanted.has(String(c._id)))
        .map((c) => {
          const loc = getCategoryLocale(c, locale);
          const other = getCategoryLocale(c, locale === "en" ? "vi" : "en");
          return {
            id: String(c._id),
            name: loc.name || other.name,
            slug: loc.slug || other.slug,
            description: loc.description || other.description,
          };
        })
        .filter((c) => c.name && c.slug);
      // Preserve admin selection order when explicit ids are set.
      if (selected.length) {
        const byId = new Map(categories.map((c) => [c.id, c]));
        return {
          categories: selected
            .map((id) => byId.get(id))
            .filter((c): c is ResolvedCategoryCard => Boolean(c)),
        };
      }
      return { categories };
    }
    case "menu": {
      const location = source.menuLocation ?? "navigation";
      const links = await listPublicMenuLinks(location, locale);
      return { menuLinks: links };
    }
    case "spacer":
      return {
        spacerHeight: Math.min(
          Math.max(settingNumber(settings, "height", 32), 8),
          400,
        ),
      };
    default:
      return {};
  }
}

export async function resolveLayoutBlocks(
  layout: TemplateLayout,
  locale: AppLocale,
  page: BlockPageContext,
  options?: { categoryIds?: string[] },
): Promise<Map<string, ResolvedBlockData>> {
  const entries = await Promise.all(
    (layout.sections ?? []).flatMap((section) =>
      (section.blocks ?? []).map(async (block) => {
        const data = await resolveBlock(block, locale, page, options);
        return [block.id, data] as const;
      }),
    ),
  );
  return new Map(entries);
}

export function galleryImagesFromPage(page: PageDocument) {
  if (!Array.isArray(page.galleryItems)) return [];
  return page.galleryItems
    .filter((item) => item?.url)
    .map((item, index) => ({
      id: String(item.mediaId || item.url || index),
      url: String(item.url),
      alt: String(item.alt || item.originalName || ""),
    }));
}
