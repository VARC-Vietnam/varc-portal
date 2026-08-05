import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { MediaKind } from "@/lib/media/types";

export type { MediaKind };

const MediaSchema = new Schema(
  {
    key: { type: String, required: true, unique: true, index: true },
    url: { type: String, required: true },
    contentType: { type: String, required: true, index: true },
    kind: {
      type: String,
      enum: ["image", "video", "file"],
      required: true,
      index: true,
    },
    size: { type: Number, required: true },
    originalName: { type: String, required: true },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    alt: { type: String, default: "" },
    deletedAt: { type: Date, default: null, index: true },
  },
  { timestamps: true },
);

MediaSchema.index({ deletedAt: 1, createdAt: -1 });

export type MediaDocument = InferSchemaType<typeof MediaSchema> & {
  _id: mongoose.Types.ObjectId;
};

export const Media: Model<MediaDocument> =
  mongoose.models.Media ??
  mongoose.model<MediaDocument>("Media", MediaSchema);

export function mediaKindFromContentType(contentType: string): MediaKind {
  const type = contentType.toLowerCase();
  if (type.startsWith("image/")) return "image";
  if (type.startsWith("video/")) return "video";
  return "file";
}
