import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

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

const PageSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
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

export type PageDocument = InferSchemaType<typeof PageSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Page: Model<PageDocument> =
  mongoose.models.Page ?? mongoose.model<PageDocument>("Page", PageSchema);
