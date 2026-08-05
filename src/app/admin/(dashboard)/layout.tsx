import { auth, signOut } from "@/auth";
import {
  canManageEditorial,
  canManageRoles,
  canManageSite,
  canManageUsers,
} from "@/lib/roles";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { AdminToaster } from "@/components/admin/admin-toast";

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const role = session?.user?.role;
  const showEditorial = canManageEditorial(role);
  const showSite = canManageSite(role);
  const showUsers = canManageUsers(role);
  const showRoles = canManageRoles(role);

  async function signOutAction() {
    "use server";
    await signOut({ redirectTo: "/admin/login" });
  }

  return (
    <div className="min-h-[100dvh] bg-[var(--admin-bg)] text-[var(--admin-ink)] lg:flex">
      <AdminSidebar
        showEditorial={showEditorial}
        showSite={showSite}
        showUsers={showUsers}
        showRoles={showRoles}
        userEmail={session?.user?.email}
        signOutAction={signOutAction}
      />
      <div className="min-w-0 flex-1">
        <div className="mx-auto max-w-6xl overflow-x-visible px-4 py-8">
          {children}
        </div>
      </div>
      <AdminToaster />
    </div>
  );
}
