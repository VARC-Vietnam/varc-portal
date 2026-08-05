import mongoose, { Schema, type Model } from "mongoose";

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
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    template: {
      type: String,
      enum: ["default", "gallery"],
      default: "default",
      index: true,
    },
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

export type PageTemplate = "default" | "gallery";

export type PageDocument = {
  _id: mongoose.Types.ObjectId;
  status: "draft" | "published";
  template: PageTemplate;
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
