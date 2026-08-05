import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UserRoleControls } from "@/components/admin/user-role-controls";
import { listAssignableRoles } from "@/lib/app-roles";
import { connectDb } from "@/lib/db";
import {
  assignableRolesForActor,
  canChangeUserRole,
  canManageUsers,
  isAdminRole,
  isSystemAdmin,
  normalizeRoleKey,
} from "@/lib/roles";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!isAdminRole(session?.user?.role)) {
    redirect("/admin/login");
  }

  const actorRole = session?.user?.role;
  const actorUserId = session?.user?.id ?? "";
  const canManage = canManageUsers(actorRole);
  const canCreate = isSystemAdmin(actorRole);
  const allRoles = await listAssignableRoles();
  const rolesForActor = assignableRolesForActor(actorRole, allRoles);
  const roleLabelByKey = new Map(allRoles.map((role) => [role.key, role.label]));

  await connectDb();
  const users = await User.find().sort({ createdAt: -1 }).lean();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-2 text-sm text-gray-600">
        {canManage
          ? isSystemAdmin(actorRole)
            ? "Create accounts and assign any role."
            : "Assign roles for users other than yourself and Setup Admins."
          : "View registered users. You cannot change roles."}
      </p>

      {canCreate ? <CreateUserForm roles={allRoles} /> : null}

      <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200 bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Role</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const roleKey = normalizeRoleKey(user.role);
              const userId = String(user._id);
              const editable =
                canManage &&
                canChangeUserRole({
                  actorRole,
                  actorUserId,
                  targetUserId: userId,
                  targetCurrentRole: roleKey,
                });

              return (
                <tr key={userId} className="border-b border-gray-100">
                  <td className="px-4 py-3">{user.name}</td>
                  <td className="px-4 py-3">{user.email}</td>
                  <td className="px-4 py-3">
                    {editable ? (
                      <UserRoleControls
                        userId={userId}
                        role={roleKey}
                        roles={rolesForActor}
                      />
                    ) : (
                      <span>{roleLabelByKey.get(roleKey) || roleKey}</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
