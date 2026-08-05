import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";

export const MENU_LOCATIONS = ["navigation", "footer"] as const;
export type MenuLocation = (typeof MENU_LOCATIONS)[number];

export const MENU_ITEM_TYPES = ["page", "custom"] as const;
export type MenuItemType = (typeof MENU_ITEM_TYPES)[number];

const MenuLocaleSchema = new Schema(
  {
    label: { type: String, default: "" },
    url: { type: String, default: "" },
  },
  { _id: false },
);

const MenuItemSchema = new Schema(
  {
    location: {
      type: String,
      enum: MENU_LOCATIONS,
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: MENU_ITEM_TYPES,
      required: true,
      default: "page",
    },
    pageId: {
      type: Schema.Types.ObjectId,
      ref: "Page",
      default: null,
    },
    locales: {
      vi: { type: MenuLocaleSchema, required: true },
      en: { type: MenuLocaleSchema, required: true },
    },
    enabled: { type: Boolean, default: true },
    openInNewTab: { type: Boolean, default: false },
    sortOrder: { type: Number, default: 0, index: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

MenuItemSchema.index({ location: 1, sortOrder: 1 });

export type MenuItemDocument = InferSchemaType<typeof MenuItemSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const MenuItem: Model<MenuItemDocument> =
  mongoose.models.MenuItem ??
  mongoose.model<MenuItemDocument>("MenuItem", MenuItemSchema);
