import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ensureDefaultRoles } from "@/lib/app-roles";
import { canManageRoles } from "@/lib/roles";
import { RolesBoard } from "@/components/admin/roles-board";

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
        Built-in application roles. Click a card to edit display name,
        description, or assignment availability.
      </p>

      <RolesBoard roles={roles} />
    </div>
  );
}
