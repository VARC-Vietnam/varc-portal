import { connectDb } from "@/lib/db";
import {
  DEFAULT_ROLES,
  LEGACY_ROLE_MAP,
  type Role,
} from "@/lib/roles";
import { AppRole, type AppRoleDocument } from "@/models/AppRole";
import { User } from "@/models/User";

export type PublicRole = {
  id: string;
  key: string;
  label: string;
  description: string;
  sortOrder: number;
  isSystem: boolean;
  canAccessAdmin: boolean;
  canManageContent: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
  enabled: boolean;
};

function toPublicRole(doc: AppRoleDocument): PublicRole {
  return {
    id: String(doc._id),
    key: String(doc.key),
    label: doc.label,
    description: doc.description ?? "",
    sortOrder: doc.sortOrder ?? 0,
    isSystem: Boolean(doc.isSystem),
    canAccessAdmin: Boolean(doc.canAccessAdmin),
    canManageContent: Boolean(doc.canManageContent),
    canManageUsers: Boolean(doc.canManageUsers),
    canManageRoles: Boolean(doc.canManageRoles),
    enabled: doc.enabled !== false,
  };
}

let migratedUsers = false;

/** Seed built-in roles and migrate legacy user role keys. */
export async function ensureDefaultRoles(): Promise<PublicRole[]> {
  await connectDb();

  for (const role of DEFAULT_ROLES) {
    const existing = await AppRole.findOne({ key: role.key });
    if (!existing) {
      await AppRole.create({
        ...role,
        isSystem: true,
        enabled: true,
      });
      continue;
    }

    existing.isSystem = true;
    existing.canAccessAdmin = role.canAccessAdmin;
    existing.canManageContent = role.canManageContent;
    existing.canManageUsers = role.canManageUsers;
    existing.canManageRoles = role.canManageRoles;
    if (!existing.label?.trim()) existing.label = role.label;
    if (!existing.description?.trim()) existing.description = role.description;
    if (typeof existing.sortOrder !== "number") existing.sortOrder = role.sortOrder;
    await existing.save();
  }

  if (!migratedUsers) {
    for (const [from, to] of Object.entries(LEGACY_ROLE_MAP)) {
      await User.updateMany({ role: from }, { $set: { role: to } });
    }
    migratedUsers = true;
  }

  return listRoles();
}

export async function listRoles(): Promise<PublicRole[]> {
  await connectDb();
  const count = await AppRole.countDocuments();
  if (count < DEFAULT_ROLES.length) {
    return ensureDefaultRoles();
  }

  const docs = await AppRole.find()
    .sort({ sortOrder: 1, label: 1 })
    .lean<AppRoleDocument[]>();
  return docs.map(toPublicRole);
}

export async function listAssignableRoles(): Promise<PublicRole[]> {
  const roles = await ensureDefaultRoles();
  return roles.filter((role) => role.enabled);
}

export function isValidRoleKey(key: string): key is Role {
  return DEFAULT_ROLES.some((role) => role.key === key);
}
