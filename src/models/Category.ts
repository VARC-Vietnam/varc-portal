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
    locales: {
      vi: { type: LocaleSchema, required: true },
      en: { type: LocaleSchema, required: true },
    },
  },
  { timestamps: true },
);

CategorySchema.index(
  { "locales.vi.slug": 1 },
  {
    unique: true,
    partialFilterExpression: { "locales.vi.slug": { $type: "string", $gt: "" } },
  },
);
CategorySchema.index(
  { "locales.en.slug": 1 },
  {
    unique: true,
    partialFilterExpression: { "locales.en.slug": { $type: "string", $gt: "" } },
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

export const Category: Model<CategoryDocument> =
  mongoose.models.Category ??
  mongoose.model<CategoryDocument>("Category", CategorySchema);
