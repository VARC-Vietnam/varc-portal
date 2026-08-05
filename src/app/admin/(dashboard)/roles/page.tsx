import { ensureDefaultRoles } from "@/lib/app-roles";
import { requireRolesPage } from "@/lib/admin-access";
import { RolesBoard } from "@/components/admin/roles-board";

export const dynamic = "force-dynamic";

export default async function AdminRolesPage() {
  await requireRolesPage();

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
