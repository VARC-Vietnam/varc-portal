import "dotenv/config";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../src/models/User";

async function main() {
  const uri = process.env.MONGODB_URI;
  const email = process.env.INITIAL_ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.INITIAL_ADMIN_PASSWORD;
  const name = process.env.INITIAL_ADMIN_NAME?.trim() || "VARC Admin";

  if (!uri) throw new Error("MONGODB_URI is required");
  if (!email || !password) {
    throw new Error("INITIAL_ADMIN_EMAIL and INITIAL_ADMIN_PASSWORD are required");
  }

  await mongoose.connect(uri);

  const existing = await User.findOne({ email });
  const passwordHash = await bcrypt.hash(password, 12);

  if (existing) {
    existing.name = name;
    existing.passwordHash = passwordHash;
    existing.role = "setup_admin";
    await existing.save();
    console.log(`Updated setup_admin: ${email}`);
  } else {
    await User.create({
      email,
      name,
      passwordHash,
      role: "setup_admin",
    });
    console.log(`Created setup_admin: ${email}`);
  }

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => undefined);
  process.exit(1);
});
