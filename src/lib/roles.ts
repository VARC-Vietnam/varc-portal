export const ROLES = ["user", "administrator", "system_admin"] as const;
export type Role = (typeof ROLES)[number];

export function isAdminRole(role?: string | null): boolean {
  return role === "administrator" || role === "system_admin";
}

export function isSystemAdmin(role?: string | null): boolean {
  return role === "system_admin";
}
