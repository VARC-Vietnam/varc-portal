import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

const SiteLocaleSchema = new Schema(
  {
    siteName: { type: String, default: "" },
    siteTitle: { type: String, default: "" },
    tagline: { type: String, default: "" },
    copyright: { type: String, default: "" },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
  },
  { _id: false },
);

const SiteSettingsSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      default: "default",
    },
    logoUrl: { type: String, default: "" },
    faviconUrl: { type: String, default: "" },
    ogImageUrl: { type: String, default: "" },
    locales: {
      vi: { type: SiteLocaleSchema, required: true },
      en: { type: SiteLocaleSchema, required: true },
    },
  },
  { timestamps: true },
);

export type SiteLocaleContent = {
  siteName: string;
  siteTitle: string;
  tagline: string;
  copyright: string;
  metaTitle: string;
  metaDescription: string;
};

export type SiteSettingsDocument = InferSchemaType<typeof SiteSettingsSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const SiteSettings: Model<SiteSettingsDocument> =
  mongoose.models.SiteSettings ??
  mongoose.model<SiteSettingsDocument>("SiteSettings", SiteSettingsSchema);

export const SITE_SETTINGS_KEY = "default";
