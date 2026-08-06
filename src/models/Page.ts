import mongoose, { Schema, type Model } from "mongoose";
import type { TemplateLayout } from "@/lib/blocks/types";

const LocaleContentSchema = new Schema(
  {
    title: { type: String, default: "" },
    slug: { type: String, default: "" },
    content: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
  },
  { _id: false },
);

const GalleryItemSchema = new Schema(
  {
    mediaId: { type: String, required: true },
    url: { type: String, required: true },
    alt: { type: String, default: "" },
    originalName: { type: String, default: "" },
  },
  { _id: false },
);

const PageSchema = new Schema(
  {
    /** Stable key for built-in pages (e.g. home). */
    key: { type: String, default: null, trim: true },
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    /** @deprecated Use templateKey. Kept for migration of old documents. */
    template: {
      type: String,
      enum: ["default", "gallery"],
      default: "default",
      index: true,
    },
    templateKey: {
      type: String,
      default: "custom",
      index: true,
      trim: true,
    },
    /** When set, overrides the assigned template layout for this page only. */
    layoutOverride: { type: Schema.Types.Mixed, default: null },
    galleryItems: { type: [GalleryItemSchema], default: [] },
    showInNav: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0 },
    deletedAt: { type: Date, default: null, index: true },
    locales: {
      vi: { type: LocaleContentSchema, required: true },
      en: { type: LocaleContentSchema, required: true },
    },
  },
  { timestamps: true },
);

PageSchema.index(
  { key: 1 },
  {
    unique: true,
    partialFilterExpression: {
      key: { $type: "string", $gt: "" },
      deletedAt: null,
    },
  },
);

PageSchema.index(
  { "locales.vi.slug": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "locales.vi.slug": { $type: "string", $gt: "" },
      deletedAt: null,
    },
  },
);
PageSchema.index(
  { "locales.en.slug": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "locales.en.slug": { $type: "string", $gt: "" },
      deletedAt: null,
    },
  },
);

export type PageLocaleContent = {
  title: string;
  slug: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
};

export type PageGalleryItem = {
  mediaId: string;
  url: string;
  alt: string;
  originalName: string;
};

/** @deprecated Prefer templateKey. */
export type PageTemplateLegacy = "default" | "gallery";

export type PageDocument = {
  _id: mongoose.Types.ObjectId;
  key?: string | null;
  status: "draft" | "published";
  template?: PageTemplateLegacy;
  templateKey: string;
  layoutOverride?: TemplateLayout | null;
  galleryItems: PageGalleryItem[];
  showInNav: boolean;
  sortOrder: number;
  deletedAt?: Date | null;
  locales: {
    vi: PageLocaleContent;
    en: PageLocaleContent;
  };
  createdAt?: Date;
  updatedAt?: Date;
};

export const Page: Model<PageDocument> =
  (mongoose.models.Page as Model<PageDocument> | undefined) ??
  mongoose.model<PageDocument>("Page", PageSchema);
