import { z } from "zod";

export const SYSTEM_TEMPLATE_KEYS = [
  "home",
  "article",
  "category",
  "blank",
  "custom",
  "gallery",
] as const;

export type SystemTemplateKey = (typeof SYSTEM_TEMPLATE_KEYS)[number];

export const BLOCK_TYPES = [
  "richText",
  "pageContent",
  "heading",
  "image",
  "gallery",
  "articleList",
  "articleCard",
  "categoryList",
  "menu",
  "html",
  "spacer",
  "featuredSlider",
] as const;

export type BlockType = (typeof BLOCK_TYPES)[number];

export const BLOCK_ALIGNS = ["start", "center", "end", "stretch"] as const;
export type BlockAlign = (typeof BLOCK_ALIGNS)[number];

const colSpanSchema = z.object({
  mobile: z.coerce.number().int().min(1).max(12).default(12),
  tablet: z.coerce.number().int().min(1).max(12).default(12),
  desktop: z.coerce.number().int().min(1).max(12).default(12),
});

export type ColSpan = z.infer<typeof colSpanSchema>;

const galleryItemSourceSchema = z.object({
  mediaId: z.string().trim().min(1).max(64),
  url: z.string().trim().min(1).max(2048),
  alt: z.string().trim().max(500).default(""),
  originalName: z.string().trim().max(500).default(""),
});

/** Localized title/heading (and optional link) per app locale. */
export const blockLocaleContentSchema = z.object({
  text: z.string().max(5_000).default(""),
  href: z.string().max(2_048).optional(),
  html: z.string().max(500_000).optional(),
});

export type BlockLocaleContent = z.infer<typeof blockLocaleContentSchema>;

const blockSourceSchema = z
  .object({
    html: z.string().max(500_000).optional(),
    /** @deprecated Prefer locales.*.text — kept as legacy fallback. */
    text: z.string().max(5_000).optional(),
    href: z.string().max(2_048).optional(),
    locales: z
      .object({
        vi: blockLocaleContentSchema.optional(),
        en: blockLocaleContentSchema.optional(),
      })
      .optional(),
    mediaId: z.string().max(64).optional(),
    url: z.string().max(2_048).optional(),
    alt: z.string().max(500).optional(),
    galleryItems: z.array(galleryItemSourceSchema).max(500).optional(),
    articleId: z.string().max(64).optional(),
    articleIds: z.array(z.string().max(64)).max(50).optional(),
    categoryIds: z.array(z.string().max(64)).max(50).optional(),
    mode: z
      .enum(["latest", "featured", "category", "ids"])
      .optional(),
    menuLocation: z.enum(["navigation", "footer"]).optional(),
    menuParentId: z.string().max(64).nullable().optional(),
  })
  .default({});

export type BlockSource = z.infer<typeof blockSourceSchema>;

export type BlockContentLocale = "vi" | "en";

/** Resolve heading/title text for a locale with fallback chain. */
export function resolveBlockLocaleText(
  source: BlockSource,
  locale: BlockContentLocale,
): { text: string; href: string } {
  const preferred = locale === "en" ? "en" : "vi";
  const fallback = preferred === "en" ? "vi" : "en";
  const fromPreferred = source.locales?.[preferred];
  const fromFallback = source.locales?.[fallback];
  const text =
    fromPreferred?.text?.trim() ||
    fromFallback?.text?.trim() ||
    source.text?.trim() ||
    "";
  const href =
    fromPreferred?.href?.trim() ||
    fromFallback?.href?.trim() ||
    source.href?.trim() ||
    "";
  return { text, href };
}

/** Resolve rich HTML for a locale with fallback to source.html. */
export function resolveBlockLocaleHtml(
  source: BlockSource,
  locale: BlockContentLocale,
): string {
  const preferred = locale === "en" ? "en" : "vi";
  const fallback = preferred === "en" ? "vi" : "en";
  return (
    source.locales?.[preferred]?.html?.trim() ||
    source.locales?.[fallback]?.html?.trim() ||
    source.html?.trim() ||
    ""
  );
}

export function emptyBlockLocales(): NonNullable<BlockSource["locales"]> {
  return {
    vi: { text: "", href: "", html: "" },
    en: { text: "", href: "", html: "" },
  };
}

const templateBlockSchema = z.object({
  id: z.string().min(1).max(64),
  type: z.enum(BLOCK_TYPES),
  colSpan: colSpanSchema.default({ mobile: 12, tablet: 12, desktop: 12 }),
  align: z.enum(BLOCK_ALIGNS).default("stretch"),
  source: blockSourceSchema,
  settings: z.record(z.string(), z.unknown()).default({}),
});

export type TemplateBlock = z.infer<typeof templateBlockSchema>;

const templateSectionSchema = z.object({
  id: z.string().min(1).max(64),
  blocks: z.array(templateBlockSchema).max(40),
});

export type TemplateSection = z.infer<typeof templateSectionSchema>;

export const templateLayoutSchema = z.object({
  sections: z.array(templateSectionSchema).max(40),
});

export type TemplateLayout = z.infer<typeof templateLayoutSchema>;

export const pageTemplateFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(200),
  description: z.string().trim().max(2_000).default(""),
  layout: templateLayoutSchema,
});

export type PageTemplateFormValues = z.infer<typeof pageTemplateFormSchema>;

export function emptyLayout(): TemplateLayout {
  return { sections: [] };
}

export function fullWidthSpan(): ColSpan {
  return { mobile: 12, tablet: 12, desktop: 12 };
}

export function makeBlockId(): string {
  return `b_${Math.random().toString(36).slice(2, 10)}`;
}

export function makeSectionId(): string {
  return `s_${Math.random().toString(36).slice(2, 10)}`;
}

export function createBlock(
  type: BlockType,
  partial?: Partial<TemplateBlock>,
): TemplateBlock {
  return {
    id: makeBlockId(),
    type,
    colSpan: fullWidthSpan(),
    align: "stretch",
    source: {},
    settings: {},
    ...partial,
  };
}

export function createSection(blocks: TemplateBlock[] = []): TemplateSection {
  return {
    id: makeSectionId(),
    blocks,
  };
}
