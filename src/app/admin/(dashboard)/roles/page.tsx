import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ensureDefaultRoles } from "@/lib/app-roles";
import { canManageRoles } from "@/lib/roles";
import { RoleEditorCard } from "@/components/admin/role-editor-card";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  const session = await auth();
  if (!canManageRoles(session?.user?.role)) {
    redirect("/admin");
  }

  const roles = await ensureDefaultRoles();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Roles</h1>
      <p className="mt-2 text-sm text-gray-600">
        Built-in application roles. Update display names and descriptions;
        capability flags stay fixed for system roles.
      </p>

      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        {roles.map((role) => (
          <RoleEditorCard key={role.id} role={role} />
        ))}
      </div>
    </div>
  );
}
