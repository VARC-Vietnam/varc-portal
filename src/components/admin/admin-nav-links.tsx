"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/settings", label: "Site Settings" },
  { href: "/admin/articles", label: "Articles" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/pages", label: "Pages" },
  { href: "/admin/menu", label: "Menus" },
  { href: "/admin/users", label: "Users" },
];

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNavLinks({ showUsers }: { showUsers: boolean }) {
  const pathname = usePathname();

  return (
    <>
      {links
        .filter((link) => link.href !== "/admin/users" || showUsers)
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
