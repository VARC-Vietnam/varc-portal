"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard", flag: "always" as const },
  { href: "/admin/articles", label: "Articles", flag: "editorial" as const },
  { href: "/admin/categories", label: "Categories", flag: "editorial" as const },
  { href: "/admin/settings", label: "Site Settings", flag: "site" as const },
  { href: "/admin/pages", label: "Pages", flag: "site" as const },
  { href: "/admin/menu", label: "Menus", flag: "site" as const },
  { href: "/admin/users", label: "Users", flag: "users" as const },
  { href: "/admin/roles", label: "Roles", flag: "roles" as const },
];

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavLinks({
  showEditorial,
  showSite,
  showUsers,
  showRoles,
}: {
  showEditorial: boolean;
  showSite: boolean;
  showUsers: boolean;
  showRoles: boolean;
}) {
  const pathname = usePathname();

  return (
    <>
      {links
        .filter((link) => {
          if (link.flag === "editorial") return showEditorial;
          if (link.flag === "site") return showSite;
          if (link.flag === "users") return showUsers;
          if (link.flag === "roles") return showRoles;
          return true;
        })
        .map((link) => {
          const active = isActive(link.href, pathname);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`shrink-0 hover:text-black ${
                active ? "font-semibold text-black" : "text-gray-600"
              }`}
              aria-current={active ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
    </>
  );
}
