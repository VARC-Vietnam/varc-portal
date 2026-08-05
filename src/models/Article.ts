import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LocaleContentSchema = new Schema(
  {
    title: { type: String, default: "" },
    slug: { type: String, default: "" },
    excerpt: { type: String, default: "" },
    content: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
  },
  { _id: false },
);

const ArticleSchema = new Schema(
  {
    status: {
      type: String,
      enum: ["draft", "published"],
      default: "draft",
      index: true,
    },
    publishedAt: { type: Date, default: null },
    authorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    categoryIds: {
      type: [{ type: Schema.Types.ObjectId, ref: "Category" }],
      default: [],
    },
    tags: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    coverImageUrl: { type: String, default: "" },
    /** Focal point for object-position when cover is cropped (0–100%). */
    coverImageFocus: {
      type: Schema.Types.Mixed,
      default: () => ({ x: 50, y: 50 }),
    },
    ogImageUrl: { type: String, default: "" },
    featured: { type: Boolean, default: false, index: true },
    locales: {
      vi: { type: LocaleContentSchema, required: true },
      en: { type: LocaleContentSchema, required: true },
    },
  },
  { timestamps: true },
);

ArticleSchema.index(
  { "locales.vi.slug": 1 },
  {
    unique: true,
    partialFilterExpression: { "locales.vi.slug": { $type: "string", $gt: "" } },
  },
);
ArticleSchema.index(
  { "locales.en.slug": 1 },
  {
    unique: true,
    partialFilterExpression: { "locales.en.slug": { $type: "string", $gt: "" } },
  },
);
ArticleSchema.index({ status: 1, publishedAt: -1 });
ArticleSchema.index({ status: 1, featured: 1, publishedAt: -1 });
ArticleSchema.index({ categoryIds: 1 });
ArticleSchema.index({ tags: 1 });

export type LocaleContent = {
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  metaTitle: string;
  metaDescription: string;
};

export type ArticleDocument = InferSchemaType<typeof ArticleSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Article: Model<ArticleDocument> =
  mongoose.models.Article ??
  mongoose.model<ArticleDocument>("Article", ArticleSchema);
