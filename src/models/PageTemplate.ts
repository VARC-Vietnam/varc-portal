import mongoose, { Schema, type Model } from "mongoose";
import type { TemplateLayout } from "@/lib/blocks/types";

const PageTemplateSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    isSystem: { type: Boolean, default: false, index: true },
    layout: { type: Schema.Types.Mixed, required: true },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

export type PageTemplateDocument = {
  _id: mongoose.Types.ObjectId;
  key: string;
  name: string;
  description: string;
  isSystem: boolean;
  layout: TemplateLayout;
  deletedAt?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
};

export const PageTemplate: Model<PageTemplateDocument> =
  (mongoose.models.PageTemplate as Model<PageTemplateDocument> | undefined) ??
  mongoose.model<PageTemplateDocument>("PageTemplate", PageTemplateSchema);
