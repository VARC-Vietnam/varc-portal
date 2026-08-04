import { connectDb } from "@/lib/db";
import { Category, type CategoryDocument } from "@/models/Category";
import { Page, type PageDocument, type PageLocaleContent } from "@/models/Page";
import type { AppLocale } from "@/i18n/routing";

function localeKey(locale: AppLocale): "vi" | "en" {
  return locale === "en" ? "en" : "vi";
}

export async function listCategories() {
  await connectDb();
  return Category.find().sort({ createdAt: -1 }).lean<CategoryDocument[]>();
}

export function getCategoryLocale(category: CategoryDocument, locale: AppLocale) {
  const key = localeKey(locale);
  const content = category.locales?.[key];
  return {
    name: content?.name ?? "",
    slug: content?.slug ?? "",
    description: content?.description ?? "",
  };
}

export async function getCategoryById(id: string) {
  await connectDb();
  return Category.findById(id).lean<CategoryDocument | null>();
}

export async function listPages() {
  await connectDb();
  return Page.find().sort({ sortOrder: 1, updatedAt: -1 }).lean<PageDocument[]>();
}

export function getPageLocale(
  page: PageDocument,
  locale: AppLocale,
): PageLocaleContent {
  const key = localeKey(locale);
  const content = page.locales?.[key];
  return {
    title: content?.title ?? "",
    slug: content?.slug ?? "",
    content: content?.content ?? "",
    metaTitle: content?.metaTitle ?? "",
    metaDescription: content?.metaDescription ?? "",
  };
}

export async function getPageById(id: string) {
  await connectDb();
  return Page.findById(id).lean<PageDocument | null>();
}

export async function getPublishedPageBySlug(locale: AppLocale, slug: string) {
  await connectDb();
  const key = localeKey(locale);
  return Page.findOne({
    status: "published",
    [`locales.${key}.slug`]: slug,
  }).lean<PageDocument | null>();
}

export type NavPageItem = {
  id: string;
  title: string;
  slug: string;
  /** Locale of the slug/title used for the link (may fall back to vi). */
  linkLocale: AppLocale;
};

export async function listNavPages(locale: AppLocale): Promise<NavPageItem[]> {
  await connectDb();
  const pages = await Page.find({
    status: "published",
    showInNav: true,
  })
    .sort({ sortOrder: 1, updatedAt: -1 })
    .lean<PageDocument[]>();

  const items: NavPageItem[] = [];

  for (const page of pages) {
    const preferred = getPageLocale(page, locale);
    const fallback = getPageLocale(page, locale === "en" ? "vi" : "en");

    if (preferred.slug && preferred.title) {
      items.push({
        id: String(page._id),
        title: preferred.title,
        slug: preferred.slug,
        linkLocale: locale,
      });
      continue;
    }

    // Show published nav pages even if the other language is not translated yet.
    if (fallback.slug && fallback.title) {
      items.push({
        id: String(page._id),
        title: fallback.title,
        slug: fallback.slug,
        linkLocale: locale === "en" ? "vi" : "en",
      });
    }
  }

  return items;
}

export async function listPublishedPagesForSitemap() {
  await connectDb();
  return Page.find({ status: "published" })
    .select("locales updatedAt")
    .lean<PageDocument[]>();
}
