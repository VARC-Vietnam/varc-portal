import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { CreateUserForm } from "@/components/admin/create-user-form";
import { UserRoleControls } from "@/components/admin/user-role-controls";
import { connectDb } from "@/lib/db";
import { isAdminRole, isSystemAdmin } from "@/lib/roles";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const session = await auth();
  if (!isAdminRole(session?.user?.role)) {
    redirect("/admin/login");
  }

  const canManage = isSystemAdmin(session?.user?.role);

  await connectDb();
  const users = await User.find().sort({ createdAt: -1 }).lean();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Users</h1>
      <p className="mt-2 text-sm text-gray-600">
        {canManage
          ? "Create accounts and grant administrator access. Only system_admin can change roles."
          : "View registered users. Role changes require system_admin."}
      </p>

      {canManage ? <CreateUserForm /> : null}

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
            {users.map((user) => (
              <tr key={String(user._id)} className="border-b border-gray-100">
                <td className="px-4 py-3">{user.name}</td>
                <td className="px-4 py-3">{user.email}</td>
                <td className="px-4 py-3">
                  {canManage ? (
                    <UserRoleControls
                      userId={String(user._id)}
                      role={user.role}
                      disabled={user.email === session?.user?.email}
                    />
                  ) : (
                    <span>{user.role}</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
