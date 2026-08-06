import type { BlockType } from "@/lib/blocks/types";

export const BLOCK_TYPE_LABELS: Record<BlockType, string> = {
  richText: "Rich text",
  pageContent: "Page content",
  heading: "Heading",
  image: "Image",
  gallery: "Gallery",
  articleList: "Article list",
  articleCard: "Article card",
  categoryList: "Category list",
  menu: "Menu",
  html: "HTML",
  spacer: "Spacer",
  featuredSlider: "Featured slider",
};

/** Palette entries shown in the template builder (can include presets). */
export type BlockPaletteItem = {
  id: string;
  type: BlockType;
  label: string;
  description?: string;
  partial?: {
    source?: Record<string, unknown>;
    settings?: Record<string, unknown>;
  };
};

export const BLOCK_PALETTE: BlockPaletteItem[] = [
  { id: "heading", type: "heading", label: "Heading" },
  { id: "pageContent", type: "pageContent", label: "Page content" },
  { id: "richText", type: "richText", label: "Rich text" },
  { id: "html", type: "html", label: "HTML" },
  { id: "image", type: "image", label: "Image" },
  { id: "gallery", type: "gallery", label: "Gallery" },
  {
    id: "featuredSlider",
    type: "featuredSlider",
    label: "Featured slider",
    description: "Full-width hero carousel",
    partial: { source: { mode: "featured" }, settings: { limit: 3 } },
  },
  {
    id: "articleSpotlight",
    type: "articleList",
    label: "Spotlight (1:3)",
    description: "1 lead + 3 supporting posts",
    partial: {
      source: { mode: "latest" },
      settings: { limit: 4, variant: "spotlight" },
    },
  },
  {
    id: "articleList",
    type: "articleList",
    label: "Article list (grid)",
    description: "Card grid of articles",
    partial: {
      source: { mode: "latest" },
      settings: { limit: 6, variant: "grid" },
    },
  },
  { id: "articleCard", type: "articleCard", label: "Article card" },
  { id: "categoryList", type: "categoryList", label: "Category list" },
  { id: "menu", type: "menu", label: "Menu" },
  { id: "spacer", type: "spacer", label: "Spacer" },
];
