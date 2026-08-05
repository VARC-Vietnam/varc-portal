import Link from "next/link";
import type { ReactNode } from "react";
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

function CardIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-800">
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        {children}
      </svg>
    </span>
  );
}

const CARD_ICONS = {
  settings: (
    <CardIcon>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </CardIcon>
  ),
  articles: (
    <CardIcon>
      <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
      <path d="M9 9h6M9 13h6" />
    </CardIcon>
  ),
  categories: (
    <CardIcon>
      <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
    </CardIcon>
  ),
  pages: (
    <CardIcon>
      <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M14 3v5h5" />
    </CardIcon>
  ),
  menus: (
    <CardIcon>
      <path d="M5 7h14M5 12h14M5 17h14" />
    </CardIcon>
  ),
  users: (
    <CardIcon>
      <circle cx="12" cy="8" r="3.5" />
      <path d="M5 19.5c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
    </CardIcon>
  ),
  roles: (
    <CardIcon>
      <path d="M12 3 4.5 6.5v5c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9v-5L12 3Z" />
      <path d="m9.5 12 1.7 1.7 3.3-3.4" />
    </CardIcon>
  ),
} as const;

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
          icon: CARD_ICONS.settings,
        }
      : null,
    showEditorial
      ? {
          href: "/admin/articles",
          title: "Articles",
          count: articles.length,
          hint: "Create and publish news",
          icon: CARD_ICONS.articles,
        }
      : null,
    showEditorial
      ? {
          href: "/admin/categories",
          title: "Categories",
          count: categories.length,
          hint: "Organize articles",
          icon: CARD_ICONS.categories,
        }
      : null,
    showSite
      ? {
          href: "/admin/pages",
          title: "Pages",
          count: pages.length,
          hint: "Static site pages",
          icon: CARD_ICONS.pages,
        }
      : null,
    showSite
      ? {
          href: "/admin/menu",
          title: "Menus",
          count: menuItems.length,
          hint: "Navigation and footer order",
          icon: CARD_ICONS.menus,
        }
      : null,
    showUsers
      ? {
          href: "/admin/users",
          title: "Users",
          count: users,
          hint: "Roles and access",
          icon: CARD_ICONS.users,
        }
      : null,
    showRoles
      ? {
          href: "/admin/roles",
          title: "Roles",
          count: "4",
          hint: "Setup Admin, Administrator, Editor, Reader",
          icon: CARD_ICONS.roles,
        }
      : null,
  ].filter(Boolean) as Array<{
    href: string;
    title: string;
    count: string | number;
    hint: string;
    icon: ReactNode;
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
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-medium text-gray-500">{card.title}</p>
              {card.icon}
            </div>
            <p className="mt-3 text-3xl font-semibold">{card.count}</p>
            <p className="mt-2 text-sm text-gray-600">{card.hint}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
