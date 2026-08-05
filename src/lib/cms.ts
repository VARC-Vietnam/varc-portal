import { connectDb } from "@/lib/db";
import {
  ensureUncategorizedCategory,
  notDeletedFilter,
  deletedFilter,
} from "@/lib/soft-delete";
import { Category, type CategoryDocument } from "@/models/Category";
import {
  MenuItem,
  type MenuItemDocument,
  type MenuLocation,
} from "@/models/MenuItem";
import { Page, type PageDocument, type PageLocaleContent } from "@/models/Page";
import {
  SITE_SETTINGS_KEY,
  SiteSettings,
  type SiteLocaleContent,
  type SiteSettingsDocument,
} from "@/models/SiteSettings";
import type { AppLocale } from "@/i18n/routing";
import type { SiteSettingsFormValues } from "@/lib/validations/article";

function localeKey(locale: AppLocale): "vi" | "en" {
  return locale === "en" ? "en" : "vi";
}

export async function listCategories(options?: { trash?: boolean }) {
  await connectDb();
  if (!options?.trash) {
    await ensureUncategorizedCategory();
  }
  const filter = options?.trash ? { deletedAt: { $ne: null } } : notDeletedFilter;
  return Category.find(filter)
    .sort(
      options?.trash
        ? { deletedAt: -1 }
        : { isSystem: -1, createdAt: -1 },
    )
    .lean<CategoryDocument[]>();
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

export async function listPages(options?: { trash?: boolean }) {
  await connectDb();
  const filter = options?.trash ? { deletedAt: { $ne: null } } : notDeletedFilter;
  return Page.find(filter)
    .sort(
      options?.trash
        ? { deletedAt: -1 }
        : { sortOrder: 1, updatedAt: -1 },
    )
    .lean<PageDocument[]>();
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
    ...notDeletedFilter,
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

export type PublicMenuLink = {
  id: string;
  label: string;
  kind: "page" | "custom";
  /** Present when kind === "page". */
  slug?: string;
  linkLocale?: AppLocale;
  /** Present when kind === "custom". */
  href?: string;
  openInNewTab: boolean;
};

export type AdminMenuItem = {
  id: string;
  location: MenuLocation;
  type: "page" | "custom";
  pageId: string | null;
  pageTitle: string | null;
  locales: {
    vi: { label: string; url: string };
    en: { label: string; url: string };
  };
  enabled: boolean;
  openInNewTab: boolean;
  sortOrder: number;
  deletedAt?: Date | string | null;
};

function pageNavFields(
  page: PageDocument,
  locale: AppLocale,
): Pick<NavPageItem, "title" | "slug" | "linkLocale"> | null {
  const preferred = getPageLocale(page, locale);
  const fallback = getPageLocale(page, locale === "en" ? "vi" : "en");

  if (preferred.slug && preferred.title) {
    return {
      title: preferred.title,
      slug: preferred.slug,
      linkLocale: locale,
    };
  }

  if (fallback.slug && fallback.title) {
    return {
      title: fallback.title,
      slug: fallback.slug,
      linkLocale: locale === "en" ? "vi" : "en",
    };
  }

  return null;
}

/** Legacy fallback while menus are still empty. */
export async function listNavPages(locale: AppLocale): Promise<NavPageItem[]> {
  await connectDb();
  const pages = await Page.find({
    ...notDeletedFilter,
    status: "published",
    showInNav: true,
  })
    .sort({ sortOrder: 1, updatedAt: -1 })
    .lean<PageDocument[]>();

  const items: NavPageItem[] = [];
  for (const page of pages) {
    const fields = pageNavFields(page, locale);
    if (!fields) continue;
    items.push({ id: String(page._id), ...fields });
  }
  return items;
}

export async function listMenuItemsAdmin(
  options?: { location?: MenuLocation; trash?: boolean },
): Promise<AdminMenuItem[]> {
  await connectDb();
  const filter: Record<string, unknown> = options?.trash
    ? { ...deletedFilter }
    : { ...notDeletedFilter };
  if (options?.location) filter.location = options.location;

  const items = await MenuItem.find(filter)
    .sort(
      options?.trash
        ? { deletedAt: -1 }
        : { location: 1, sortOrder: 1, updatedAt: -1 },
    )
    .lean<MenuItemDocument[]>();

  const pageIds = items
    .map((item) => item.pageId)
    .filter((id): id is NonNullable<typeof id> => Boolean(id));
  const pages = pageIds.length
    ? await Page.find({ _id: { $in: pageIds } }).lean<PageDocument[]>()
    : [];
  const pageById = new Map(pages.map((page) => [String(page._id), page]));

  return items.map((item) => {
    const page = item.pageId ? pageById.get(String(item.pageId)) : null;
    const pageTitle = page
      ? getPageLocale(page, "vi").title ||
        getPageLocale(page, "en").title ||
        null
      : null;

    return {
      id: String(item._id),
      location: item.location as MenuLocation,
      type: item.type as "page" | "custom",
      pageId: item.pageId ? String(item.pageId) : null,
      pageTitle,
      locales: {
        vi: {
          label: item.locales?.vi?.label ?? "",
          url: item.locales?.vi?.url ?? "",
        },
        en: {
          label: item.locales?.en?.label ?? "",
          url: item.locales?.en?.url ?? "",
        },
      },
      enabled: Boolean(item.enabled),
      openInNewTab: Boolean(item.openInNewTab),
      sortOrder: item.sortOrder ?? 0,
      deletedAt: item.deletedAt ?? null,
    };
  });
}

export async function countMenuItems(options?: {
  location?: MenuLocation;
  trash?: boolean;
}): Promise<number> {
  await connectDb();
  const filter: Record<string, unknown> = options?.trash
    ? { ...deletedFilter }
    : { ...notDeletedFilter };
  if (options?.location) filter.location = options.location;
  return MenuItem.countDocuments(filter);
}

export async function listPublicMenuLinks(
  location: MenuLocation,
  locale: AppLocale,
): Promise<PublicMenuLink[]> {
  await connectDb();
  const items = await MenuItem.find({ location, enabled: true, ...notDeletedFilter })
    .sort({ sortOrder: 1, updatedAt: -1 })
    .lean<MenuItemDocument[]>();

  if (items.length === 0 && location === "navigation") {
    const legacy = await listNavPages(locale);
    return legacy.map((page) => ({
      id: page.id,
      label: page.title,
      kind: "page" as const,
      slug: page.slug,
      linkLocale: page.linkLocale,
      openInNewTab: false,
    }));
  }

  const pageIds = items
    .filter((item) => item.type === "page" && item.pageId)
    .map((item) => item.pageId!);
  const pages = pageIds.length
    ? await Page.find({
        _id: { $in: pageIds },
        ...notDeletedFilter,
        status: "published",
      }).lean<PageDocument[]>()
    : [];
  const pageById = new Map(pages.map((page) => [String(page._id), page]));

  const links: PublicMenuLink[] = [];

  for (const item of items) {
    if (item.type === "custom") {
      const preferred = item.locales?.[localeKey(locale)];
      const fallback = item.locales?.[locale === "en" ? "vi" : "en"];
      const label = preferred?.label?.trim() || fallback?.label?.trim();
      const href = preferred?.url?.trim() || fallback?.url?.trim();
      if (!label || !href) continue;
      links.push({
        id: String(item._id),
        label,
        kind: "custom",
        href,
        openInNewTab: Boolean(item.openInNewTab),
      });
      continue;
    }

    if (!item.pageId) continue;
    const page = pageById.get(String(item.pageId));
    if (!page) continue;
    const fields = pageNavFields(page, locale);
    if (!fields) continue;

    const override =
      item.locales?.[localeKey(locale)]?.label?.trim() ||
      item.locales?.[locale === "en" ? "vi" : "en"]?.label?.trim();

    links.push({
      id: String(item._id),
      label: override || fields.title,
      kind: "page",
      slug: fields.slug,
      linkLocale: fields.linkLocale,
      openInNewTab: Boolean(item.openInNewTab),
    });
  }

  return links;
}

/**
 * Import published showInNav pages into the Navigation menu on first setup only.
 * Does not run again after the admin has created, imported, or trashed menu items.
 */
export async function importNavPagesIntoMenuIfEmpty(): Promise<number> {
  await connectDb();

  if (await MenuItem.exists({ location: "navigation" })) {
    await SiteSettings.findOneAndUpdate(
      { key: SITE_SETTINGS_KEY },
      { $set: { menuNavImported: true } },
      { upsert: true },
    );
    return 0;
  }

  const settings = await SiteSettings.findOne({ key: SITE_SETTINGS_KEY }).lean();
  if (settings?.menuNavImported) {
    return 0;
  }

  const pages = await Page.find({
    ...notDeletedFilter,
    status: "published",
    showInNav: true,
  })
    .sort({ sortOrder: 1, updatedAt: -1 })
    .lean<PageDocument[]>();

  if (pages.length === 0) return 0;

  await MenuItem.insertMany(
    pages.map((page, index) => ({
      location: "navigation",
      type: "page",
      pageId: page._id,
      locales: { vi: { label: "", url: "" }, en: { label: "", url: "" } },
      enabled: true,
      openInNewTab: false,
      sortOrder: index,
    })),
  );

  await SiteSettings.findOneAndUpdate(
    { key: SITE_SETTINGS_KEY },
    { $set: { menuNavImported: true } },
    { upsert: true },
  );

  return pages.length;
}

export async function listPublishedPagesForSitemap() {
  await connectDb();
  return Page.find({ ...notDeletedFilter, status: "published" })
    .select("locales updatedAt")
    .lean<PageDocument[]>();
}

const DEFAULT_SITE_LOCALES: Record<"vi" | "en", SiteLocaleContent> = {
  vi: {
    siteName: "VARC",
    siteTitle: "Hiệp hội Vô tuyến Nghiệp dư Việt Nam",
    tagline: "Cổng thông tin chính thức của cộng đồng vô tuyến nghiệp dư Việt Nam.",
    copyright: "Hiệp hội Vô tuyến Nghiệp dư Việt Nam.",
    metaTitle: "VARC",
    metaDescription:
      "Cổng thông tin Hiệp hội Vô tuyến Nghiệp dư Việt Nam / Vietnam Amateur Radio Club portal",
  },
  en: {
    siteName: "VARC",
    siteTitle: "Vietnam Amateur Radio Club",
    tagline: "Official information portal for Vietnam's amateur radio community.",
    copyright: "Vietnam Amateur Radio Club.",
    metaTitle: "VARC",
    metaDescription:
      "Official information portal for Vietnam's amateur radio community.",
  },
};

export type PublicSiteBranding = SiteLocaleContent & {
  logoUrl: string;
  faviconUrl: string;
  ogImageUrl: string;
};

function mergeLocale(
  preferred: Partial<SiteLocaleContent> | undefined,
  fallback: SiteLocaleContent,
): SiteLocaleContent {
  return {
    siteName: preferred?.siteName?.trim() || fallback.siteName,
    siteTitle: preferred?.siteTitle?.trim() || fallback.siteTitle,
    tagline: preferred?.tagline?.trim() || fallback.tagline,
    copyright: preferred?.copyright?.trim() || fallback.copyright,
    metaTitle: preferred?.metaTitle?.trim() || fallback.metaTitle,
    metaDescription:
      preferred?.metaDescription?.trim() || fallback.metaDescription,
  };
}

export function getDefaultSiteSettingsForm(): SiteSettingsFormValues {
  return {
    logoUrl: "",
    faviconUrl: "",
    ogImageUrl: "",
    locales: {
      vi: { ...DEFAULT_SITE_LOCALES.vi },
      en: { ...DEFAULT_SITE_LOCALES.en },
    },
  };
}

export async function getSiteSettingsDocument() {
  await connectDb();
  return SiteSettings.findOne({ key: SITE_SETTINGS_KEY }).lean<SiteSettingsDocument | null>();
}

export async function getSiteSettingsFormValues(): Promise<SiteSettingsFormValues> {
  const doc = await getSiteSettingsDocument();
  if (!doc) return getDefaultSiteSettingsForm();

  return {
    logoUrl: doc.logoUrl ?? "",
    faviconUrl: doc.faviconUrl ?? "",
    ogImageUrl: doc.ogImageUrl ?? "",
    locales: {
      vi: mergeLocale(doc.locales?.vi, DEFAULT_SITE_LOCALES.vi),
      en: mergeLocale(doc.locales?.en, DEFAULT_SITE_LOCALES.en),
    },
  };
}

export async function getPublicSiteBranding(
  locale: AppLocale,
): Promise<PublicSiteBranding> {
  const key = localeKey(locale);
  const doc = await getSiteSettingsDocument();
  const defaults = DEFAULT_SITE_LOCALES[key];

  if (!doc) {
    return {
      ...defaults,
      logoUrl: "",
      faviconUrl: "",
      ogImageUrl: "",
    };
  }

  const preferred = doc.locales?.[key];
  const fallback = doc.locales?.[key === "en" ? "vi" : "en"];
  const localeContent = mergeLocale(
    preferred,
    mergeLocale(fallback, defaults),
  );

  return {
    ...localeContent,
    logoUrl: doc.logoUrl ?? "",
    faviconUrl: doc.faviconUrl ?? "",
    ogImageUrl: doc.ogImageUrl ?? "",
  };
}
