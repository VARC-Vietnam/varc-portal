import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import type { Role } from "@/lib/roles";

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    passwordHash: { type: String, default: null },
    role: {
      type: String,
      default: "reader",
      index: true,
    },
    image: { type: String, default: null },
    emailVerified: { type: Date, default: null },
  },
  { timestamps: true },
);

export type UserDocument = InferSchemaType<typeof UserSchema> & {
  _id: mongoose.Types.ObjectId;
  role: Role | string;
};

export const User: Model<UserDocument> =
  mongoose.models.User ?? mongoose.model<UserDocument>("User", UserSchema);
