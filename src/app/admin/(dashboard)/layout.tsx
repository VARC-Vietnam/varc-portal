import { auth, signOut } from "@/auth";
import Link from "next/link";
import { isSystemAdmin } from "@/lib/roles";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/menu", label: "Menus" },
  { href: "/admin/users", label: "Users" },
];

export default async function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const showUsers =
    isSystemAdmin(session?.user?.role) ||
    session?.user?.role === "administrator";

  return (
    <div className="min-h-[100dvh] bg-[var(--admin-bg)] text-[var(--admin-ink)]">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-5 overflow-x-auto text-sm">
            <Link href="/admin" className="shrink-0 font-semibold">
              VARC Admin
            </Link>
            {links
              .filter((link) => link.href !== "/admin/users" || showUsers)
              .map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="shrink-0 text-gray-600 hover:text-black"
                >
                  {link.label}
                </Link>
              ))}
            <Link href="/" className="shrink-0 text-gray-600 hover:text-black">
              View site
            </Link>
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
    </div>
  );
}
