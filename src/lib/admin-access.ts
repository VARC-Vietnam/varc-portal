import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  canManageEditorial,
  canManageSite,
  canManageUsers,
  canManageRoles,
  isAdminRole,
} from "@/lib/roles";

export async function requireAdminPage() {
  const session = await auth();
  if (!session?.user?.id || !isAdminRole(session.user.role)) {
    redirect("/admin/login");
  }
  return session;
}

export async function requireEditorialPage() {
  const session = await requireAdminPage();
  if (!canManageEditorial(session.user.role)) {
    redirect("/admin");
  }
  return session;
}

export async function requireSitePage() {
  const session = await requireAdminPage();
  if (!canManageSite(session.user.role)) {
    redirect("/admin");
  }
  return session;
}

export async function requireUsersPage() {
  const session = await requireAdminPage();
  if (!canManageUsers(session.user.role)) {
    redirect("/admin");
  }
  return session;
}

export async function requireRolesPage() {
  const session = await requireAdminPage();
  if (!canManageRoles(session.user.role)) {
    redirect("/admin");
  }
  return session;
}
