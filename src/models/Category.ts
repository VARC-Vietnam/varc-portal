import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const LocaleSchema = new Schema(
  {
    name: { type: String, default: "" },
    slug: { type: String, default: "" },
    description: { type: String, default: "" },
  },
  { _id: false },
);

const CategorySchema = new Schema(
  {
    /** Stable key for built-in categories (e.g. uncategorized). */
    key: { type: String, default: null },
    isSystem: { type: Boolean, default: false },
    deletedAt: { type: Date, default: null, index: true },
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },
    sortOrder: { type: Number, default: 0, index: true },
    locales: {
      vi: { type: LocaleSchema, required: true },
      en: { type: LocaleSchema, required: true },
    },
  },
  { timestamps: true },
);

CategorySchema.index({ parentId: 1, sortOrder: 1 });
CategorySchema.index(
  { "locales.vi.slug": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "locales.vi.slug": { $type: "string", $gt: "" },
      deletedAt: null,
    },
  },
);
CategorySchema.index(
  { "locales.en.slug": 1 },
  {
    unique: true,
    partialFilterExpression: {
      "locales.en.slug": { $type: "string", $gt: "" },
      deletedAt: null,
    },
  },
);
CategorySchema.index(
  { key: 1 },
  {
    unique: true,
    partialFilterExpression: { key: { $type: "string", $gt: "" } },
  },
);

export type CategoryLocale = {
  name: string;
  slug: string;
  description: string;
};

export type CategoryDocument = InferSchemaType<typeof CategorySchema> & {
  _id: mongoose.Types.ObjectId;
};

// Hot-reload can keep a stale model without parentId/sortOrder.
if (mongoose.models.Category) {
  delete mongoose.models.Category;
}
const connectionModels = mongoose.connection.models as Record<
  string,
  Model<unknown> | undefined
>;
if (connectionModels.Category) {
  delete connectionModels.Category;
}

export const Category: Model<CategoryDocument> = mongoose.model<CategoryDocument>(
  "Category",
  CategorySchema,
);
