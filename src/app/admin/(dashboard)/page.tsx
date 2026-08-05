import Link from "next/link";
import { auth } from "@/auth";
import { listAllArticles } from "@/lib/articles";
import { listCategories, listMenuItemsAdmin, listPages } from "@/lib/cms";
import { connectDb } from "@/lib/db";
import {
  canManageEditorial,
  canManageRoles,
  canManageSite,
  canManageUsers,
} from "@/lib/roles";
import { User } from "@/models/User";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const session = await auth();
  const role = session?.user?.role;
  const showEditorial = canManageEditorial(role);
  const showSite = canManageSite(role);
  const showUsers = canManageUsers(role);
  const showRoles = canManageRoles(role);

  await connectDb();
  const [articles, categories, pages, menuItems, users] = await Promise.all([
    showEditorial ? listAllArticles() : Promise.resolve([]),
    showEditorial ? listCategories() : Promise.resolve([]),
    showSite ? listPages() : Promise.resolve([]),
    showSite ? listMenuItemsAdmin() : Promise.resolve([]),
    showUsers ? User.countDocuments() : Promise.resolve(0),
  ]);

  const cards = [
    showSite
      ? {
          href: "/admin/settings",
          title: "Site Settings",
          count: "•",
          hint: "Name, logo, SEO, copyright",
        }
      : null,
    showEditorial
      ? {
          href: "/admin/articles",
          title: "Articles",
          count: articles.length,
          hint: "Create and publish news",
        }
      : null,
    showEditorial
      ? {
          href: "/admin/categories",
          title: "Categories",
          count: categories.length,
          hint: "Organize articles",
        }
      : null,
    showSite
      ? {
          href: "/admin/pages",
          title: "Pages",
          count: pages.length,
          hint: "Static site pages",
        }
      : null,
    showSite
      ? {
          href: "/admin/menu",
          title: "Menus",
          count: menuItems.length,
          hint: "Navigation and footer order",
        }
      : null,
    showUsers
      ? {
          href: "/admin/users",
          title: "Users",
          count: users,
          hint: "Roles and access",
        }
      : null,
    showRoles
      ? {
          href: "/admin/roles",
          title: "Roles",
          count: "4",
          hint: "Setup Admin, Administrator, Editor, Reader",
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    title: string;
    count: string | number;
    hint: string;
  }>;

  return (
    <div>
      <h1 className="text-2xl font-semibold">Dashboard</h1>
      <p className="mt-2 text-sm text-gray-600">
        {showSite
          ? "Manage portal content, menus, and admin access."
          : "Manage articles and categories."}
      </p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-lg border border-gray-200 bg-white p-5 transition hover:border-gray-400"
          >
            <p className="text-sm text-gray-500">{card.title}</p>
            <p className="mt-2 text-3xl font-semibold">{card.count}</p>
            <p className="mt-2 text-sm text-gray-600">{card.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
