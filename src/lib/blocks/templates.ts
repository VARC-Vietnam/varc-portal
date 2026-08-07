import { connectDb } from "@/lib/db";
import {
  cacheAside,
  CmsCacheKeys,
  CmsCacheTags,
} from "@/lib/cache/cms-cache";
import { SYSTEM_TEMPLATE_SEEDS } from "@/lib/blocks/presets";
import {
  templateLayoutSchema,
  type TemplateLayout,
} from "@/lib/blocks/types";
import { notDeletedFilter } from "@/lib/soft-delete";
import { Page, type PageDocument } from "@/models/Page";
import {
  PageTemplate,
  type PageTemplateDocument,
} from "@/models/PageTemplate";
import { SITE_SETTINGS_KEY, SiteSettings } from "@/models/SiteSettings";

export const HOME_PAGE_KEY = "home";

export type PublicTemplateSummary = {
  id: string;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
};

const HOME_PAGE_LOCALES = {
  vi: {
    title: "Trang chủ",
    slug: "trang-chu",
    content: "",
    metaTitle: "Trang chủ",
    metaDescription: "",
  },
  en: {
    title: "Home",
    slug: "home",
    content: "",
    metaTitle: "Home",
    metaDescription: "",
  },
} as const;

export function resolvePageTemplateKey(page: PageDocument): string {
  if (page.templateKey?.trim()) return page.templateKey.trim();
  if (page.template === "gallery") return "gallery";
  return "custom";
}

export async function ensureSystemTemplates(): Promise<number> {
  await connectDb();
  let upserted = 0;
  for (const seed of SYSTEM_TEMPLATE_SEEDS) {
    const existing = await PageTemplate.findOne({ key: seed.key });
    if (existing) {
      if (!existing.isSystem) {
        existing.isSystem = true;
        await existing.save();
      }
      continue;
    }
    await PageTemplate.create({
      key: seed.key,
      name: seed.name,
      description: seed.description,
      isSystem: true,
      layout: seed.layout,
    });
    upserted += 1;
  }
  return upserted;
}

/**
 * Ensures a published multilingual Home CMS page exists (templateKey=home)
 * and is assigned as Site Settings homePageId when unset/invalid.
 */
export async function ensureDefaultHomePage(): Promise<PageDocument> {
  await connectDb();
  await ensureSystemTemplates();

  let page = await Page.findOne({ key: HOME_PAGE_KEY });

  if (!page) {
    // Adopt an existing home-like page if present (by EN/VI slug).
    page = await Page.findOne({
      ...notDeletedFilter,
      $or: [
        { "locales.en.slug": HOME_PAGE_LOCALES.en.slug },
        { "locales.vi.slug": HOME_PAGE_LOCALES.vi.slug },
        { templateKey: "home", status: "published" },
      ],
    });
  }

  if (!page) {
    page = await Page.create({
      key: HOME_PAGE_KEY,
      status: "published",
      template: "default",
      templateKey: "home",
      layoutOverride: null,
      galleryItems: [],
      showInNav: false,
      sortOrder: -1000,
      deletedAt: null,
      locales: HOME_PAGE_LOCALES,
    });
  } else {
    let dirty = false;
    if (page.key !== HOME_PAGE_KEY) {
      page.key = HOME_PAGE_KEY;
      dirty = true;
    }
    if (page.deletedAt) {
      page.deletedAt = null;
      dirty = true;
    }
    if (page.status !== "published") {
      page.status = "published";
      dirty = true;
    }
    if (page.templateKey !== "home") {
      page.templateKey = "home";
      dirty = true;
    }
    if (!page.locales?.vi?.title?.trim()) {
      page.locales.vi = {
        ...page.locales.vi,
        ...HOME_PAGE_LOCALES.vi,
        content: page.locales.vi?.content ?? "",
      };
      dirty = true;
    }
    if (!page.locales?.en?.title?.trim()) {
      page.locales.en = {
        ...page.locales.en,
        ...HOME_PAGE_LOCALES.en,
        content: page.locales.en?.content ?? "",
      };
      dirty = true;
    }
    if (!page.locales?.vi?.slug?.trim()) {
      page.locales.vi.slug = HOME_PAGE_LOCALES.vi.slug;
      dirty = true;
    }
    if (!page.locales?.en?.slug?.trim()) {
      page.locales.en.slug = HOME_PAGE_LOCALES.en.slug;
      dirty = true;
    }
    if (dirty) await page.save();
  }

  const homeId = page._id;
  const settings = await SiteSettings.findOne({ key: SITE_SETTINGS_KEY });
  const currentHomeId = settings?.homePageId
    ? String(settings.homePageId)
    : null;

  if (!currentHomeId || currentHomeId !== String(homeId)) {
    // Only auto-assign when unset or pointing at a missing/deleted page.
    let shouldAssign = !currentHomeId;
    if (currentHomeId && currentHomeId !== String(homeId)) {
      const assigned = await Page.findOne({
        _id: currentHomeId,
        ...notDeletedFilter,
        status: "published",
      }).select("_id");
      shouldAssign = !assigned;
    }
    if (shouldAssign) {
      await SiteSettings.findOneAndUpdate(
        { key: SITE_SETTINGS_KEY },
        {
          $set: {
            key: SITE_SETTINGS_KEY,
            homePageId: homeId,
            homeTemplateKey: "home",
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true },
      );
    }
  }

  return page.toObject() as PageDocument;
}

/** Map legacy Page.template enum onto templateKey for documents missing it. */
export async function migrateLegacyPageTemplates(): Promise<number> {
  await connectDb();
  const pages = await Page.find({
    $or: [
      { templateKey: { $exists: false } },
      { templateKey: null },
      { templateKey: "" },
    ],
  });
  let updated = 0;
  for (const page of pages) {
    page.templateKey =
      page.template === "gallery" ? "gallery" : "custom";
    await page.save();
    updated += 1;
  }
  return updated;
}

export async function listPageTemplatesAdmin(): Promise<
  PageTemplateDocument[]
> {
  await connectDb();
  await ensureSystemTemplates();
  return PageTemplate.find({ ...notDeletedFilter })
    .sort({ isSystem: -1, name: 1 })
    .lean<PageTemplateDocument[]>();
}

export async function listPageTemplateOptions(): Promise<
  PublicTemplateSummary[]
> {
  const docs = await listPageTemplatesAdmin();
  return docs.map((doc) => ({
    id: String(doc._id),
    key: doc.key,
    name: doc.name,
    description: doc.description ?? "",
    isSystem: Boolean(doc.isSystem),
  }));
}

export async function getPageTemplateByKey(
  key: string,
): Promise<PageTemplateDocument | null> {
  const trimmed = key.trim();
  return cacheAside(
    CmsCacheKeys.templateByKey(trimmed),
    [CmsCacheTags.templates],
    async () => {
      await connectDb();
      await ensureSystemTemplates();
      return PageTemplate.findOne({
        key: trimmed,
        ...notDeletedFilter,
      }).lean<PageTemplateDocument | null>();
    },
  );
}

export async function getPageTemplateById(
  id: string,
): Promise<PageTemplateDocument | null> {
  await connectDb();
  return PageTemplate.findOne({
    _id: id,
    ...notDeletedFilter,
  }).lean<PageTemplateDocument | null>();
}

export function parseLayout(raw: unknown): TemplateLayout | null {
  const parsed = templateLayoutSchema.safeParse(raw);
  if (parsed.success) return parsed.data;

  // Salvage partially-valid layouts so customized templates still render.
  if (!raw || typeof raw !== "object") return null;
  const sectionsRaw = (raw as { sections?: unknown }).sections;
  if (!Array.isArray(sectionsRaw)) return null;

  const sections = sectionsRaw
    .map((section) => {
      const sectionParsed = templateLayoutSchema.shape.sections.element.safeParse(
        section,
      );
      if (sectionParsed.success) return sectionParsed.data;
      if (!section || typeof section !== "object") return null;
      const id =
        typeof (section as { id?: unknown }).id === "string"
          ? (section as { id: string }).id
          : `s_${Math.random().toString(36).slice(2, 10)}`;
      const blocksRaw = (section as { blocks?: unknown }).blocks;
      if (!Array.isArray(blocksRaw)) return { id, blocks: [] };
      const blocks = blocksRaw
        .map((block) => {
          const blockParsed =
            templateLayoutSchema.shape.sections.element.shape.blocks.element.safeParse(
              block,
            );
          return blockParsed.success ? blockParsed.data : null;
        })
        .filter((block): block is NonNullable<typeof block> => Boolean(block));
      return { id, blocks };
    })
    .filter((section): section is NonNullable<typeof section> => Boolean(section));

  return { sections };
}

export async function resolvePageLayout(
  page: PageDocument,
): Promise<{ templateKey: string; layout: TemplateLayout }> {
  const templateKey = resolvePageTemplateKey(page);
  const override = parseLayout(page.layoutOverride);
  if (override) {
    return { templateKey, layout: override };
  }
  const template = await getPageTemplateByKey(templateKey);
  if (template?.layout) {
    const fromDb = parseLayout(template.layout);
    if (fromDb) return { templateKey, layout: fromDb };
  }
  const fromSeed = parseLayout(
    SYSTEM_TEMPLATE_SEEDS.find((s) => s.key === templateKey)?.layout,
  );
  return { templateKey, layout: fromSeed ?? { sections: [] } };
}
