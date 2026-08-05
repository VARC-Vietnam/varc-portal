import { auth, signOut } from "@/auth";
import Link from "next/link";
import {
  canManageEditorial,
  canManageRoles,
  canManageSite,
  canManageUsers,
} from "@/lib/roles";
import { AdminNavLinks } from "@/components/admin/admin-nav-links";
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

  return (
    <div className="min-h-[100dvh] bg-[var(--admin-bg)] text-[var(--admin-ink)]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-5 overflow-x-auto text-sm">
            <Link href="/admin" className="shrink-0 font-semibold">
              VARC Admin
            </Link>
            <AdminNavLinks
              showEditorial={showEditorial}
              showSite={showSite}
              showUsers={showUsers}
              showRoles={showRoles}
            />
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 text-gray-600 underline hover:text-black"
            >
              View site
              <svg
                viewBox="0 0 16 16"
                className="h-3.5 w-3.5"
                aria-hidden
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M4.5 11.5 11.5 4.5" />
                <path d="M6 4.5h5.5V10" />
              </svg>
            </a>
          </div>
          <div className="flex shrink-0 items-center gap-3 text-sm">
            <span className="hidden text-gray-500 sm:inline">
              {session?.user?.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/admin/login" });
              }}
            >
              <button
                type="submit"
                className="rounded border border-gray-300 px-3 py-1 hover:bg-gray-50"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <div className="mx-auto max-w-6xl overflow-x-visible px-4 py-8">
        {children}
      </div>
      <AdminToaster />
    </div>
  );
}
