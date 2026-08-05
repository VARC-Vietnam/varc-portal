export const ROLE_KEYS = [
  "setup_admin",
  "administrator",
  "editor",
  "reader",
] as const;

export type Role = (typeof ROLE_KEYS)[number];

/** Legacy keys still accepted until migration runs. */
export const LEGACY_ROLE_MAP = {
  system_admin: "setup_admin",
  user: "reader",
} as const;

export type AnyRoleKey = Role | keyof typeof LEGACY_ROLE_MAP;

export const DEFAULT_ROLES: Array<{
  key: Role;
  label: string;
  description: string;
  sortOrder: number;
  canAccessAdmin: boolean;
  canManageContent: boolean;
  canManageSite: boolean;
  canManageUsers: boolean;
  canManageRoles: boolean;
}> = [
  {
    key: "setup_admin",
    label: "Setup Admin",
    description: "Full system access, including users and roles (system admin).",
    sortOrder: 0,
    canAccessAdmin: true,
    canManageContent: true,
    canManageSite: true,
    canManageUsers: true,
    canManageRoles: true,
  },
  {
    key: "administrator",
    label: "Administrator",
    description: "Manage site content, menus, settings, and most user roles.",
    sortOrder: 1,
    canAccessAdmin: true,
    canManageContent: true,
    canManageSite: true,
    canManageUsers: true,
    canManageRoles: false,
  },
  {
    key: "editor",
    label: "Editor",
    description: "Create and edit articles and categories only.",
    sortOrder: 2,
    canAccessAdmin: true,
    canManageContent: true,
    canManageSite: false,
    canManageUsers: false,
    canManageRoles: false,
  },
  {
    key: "reader",
    label: "Reader",
    description: "Public portal access only; cannot open the admin panel.",
    sortOrder: 3,
    canAccessAdmin: false,
    canManageContent: false,
    canManageSite: false,
    canManageUsers: false,
    canManageRoles: false,
  },
];

export function normalizeRoleKey(role?: string | null): Role {
  if (!role) return "reader";
  if (role in LEGACY_ROLE_MAP) {
    return LEGACY_ROLE_MAP[role as keyof typeof LEGACY_ROLE_MAP];
  }
  if ((ROLE_KEYS as readonly string[]).includes(role)) {
    return role as Role;
  }
  return "reader";
}

export function isAdminRole(role?: string | null): boolean {
  const key = normalizeRoleKey(role);
  return (
    key === "setup_admin" || key === "administrator" || key === "editor"
  );
}

export function isSystemAdmin(role?: string | null): boolean {
  return normalizeRoleKey(role) === "setup_admin";
}

export function canManageUsers(role?: string | null): boolean {
  const key = normalizeRoleKey(role);
  return key === "setup_admin" || key === "administrator";
}

export function canManageRoles(role?: string | null): boolean {
  return isSystemAdmin(role);
}

/** Articles + categories (Editor and above). */
export function canManageEditorial(role?: string | null): boolean {
  const key = normalizeRoleKey(role);
  return key === "setup_admin" || key === "administrator" || key === "editor";
}

export function canManageArticles(role?: string | null): boolean {
  return canManageEditorial(role);
}

export function canManageCategories(role?: string | null): boolean {
  return canManageEditorial(role);
}

/** Site settings, pages, and menus (not Editor). */
export function canManageSite(role?: string | null): boolean {
  const key = normalizeRoleKey(role);
  return key === "setup_admin" || key === "administrator";
}

/**
 * Who may change whose role:
 * - Setup Admin: anyone (including self)
 * - Administrator: anyone except self and Setup Admin; cannot assign Setup Admin
 * - Editor / Reader: nobody (including self)
 */
export function canChangeUserRole(params: {
  actorRole?: string | null;
  actorUserId?: string | null;
  targetUserId: string;
  targetCurrentRole?: string | null;
  nextRole?: string | null;
}): boolean {
  const actor = normalizeRoleKey(params.actorRole);
  const targetCurrent = normalizeRoleKey(params.targetCurrentRole);
  const next = params.nextRole
    ? normalizeRoleKey(params.nextRole)
    : undefined;

  if (actor === "setup_admin") {
    return true;
  }

  if (actor !== "administrator") {
    return false;
  }

  if (
    params.actorUserId &&
    params.actorUserId === params.targetUserId
  ) {
    return false;
  }

  if (targetCurrent === "setup_admin") {
    return false;
  }

  if (next === "setup_admin") {
    return false;
  }

  return true;
}

export function assignableRolesForActor<T extends { key: string }>(
  actorRole: string | null | undefined,
  allRoles: T[],
): T[] {
  const actor = normalizeRoleKey(actorRole);
  if (actor === "setup_admin") return allRoles;
  if (actor === "administrator") {
    return allRoles.filter((role) => role.key !== "setup_admin");
  }
  return [];
}
