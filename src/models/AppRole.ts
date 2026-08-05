import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { Role } from "@/lib/roles";

const AppRoleSchema = new Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    sortOrder: { type: Number, default: 0 },
    isSystem: { type: Boolean, default: true },
    canAccessAdmin: { type: Boolean, default: false },
    canManageContent: { type: Boolean, default: false },
    canManageUsers: { type: Boolean, default: false },
    canManageRoles: { type: Boolean, default: false },
    enabled: { type: Boolean, default: true },
  },
  { timestamps: true },
);

AppRoleSchema.index({ sortOrder: 1, label: 1 });

export type AppRoleDocument = InferSchemaType<typeof AppRoleSchema> & {
  _id: mongoose.Types.ObjectId;
  key: Role | string;
};

export const AppRole: Model<AppRoleDocument> =
  mongoose.models.AppRole ??
  mongoose.model<AppRoleDocument>("AppRole", AppRoleSchema);
