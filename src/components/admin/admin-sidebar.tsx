"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore, type ReactNode } from "react";

const STORAGE_KEY = "varc-admin-sidebar-expanded";
const SIDEBAR_EVENT = "varc-admin-sidebar";

function subscribeExpanded(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(SIDEBAR_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(SIDEBAR_EVENT, onStoreChange);
  };
}

function getExpandedSnapshot() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "0";
  } catch {
    return true;
  }
}

function getExpandedServerSnapshot() {
  return true;
}

function setExpandedPreference(next: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
  } catch {
    // ignore
  }
  window.dispatchEvent(new Event(SIDEBAR_EVENT));
}

type NavFlag = "always" | "editorial" | "site" | "users" | "roles";

type NavItem = {
  href: string;
  label: string;
  flag: NavFlag;
  icon: ReactNode;
  external?: boolean;
};

type NavGroup = {
  id: string;
  label: string | null;
  items: NavItem[];
};

function Icon({ children }: { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5 shrink-0"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      {children}
    </svg>
  );
}

const navGroups: NavGroup[] = [
  {
    id: "overview",
    label: null,
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        flag: "always",
        icon: (
          <Icon>
            <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z" />
          </Icon>
        ),
      },
      {
        href: "/",
        label: "View site",
        flag: "always",
        external: true,
        icon: (
          <Icon>
            <path d="M14 4h6v6" />
            <path d="M10 14 20 4" />
            <path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5" />
          </Icon>
        ),
      },
    ],
  },
  {
    id: "system",
    label: "System",
    items: [
      {
        href: "/admin/settings",
        label: "Site Settings",
        flag: "site",
        icon: (
          <Icon>
            <circle cx="12" cy="12" r="3" />
            <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
          </Icon>
        ),
      },
      {
        href: "/admin/users",
        label: "Users",
        flag: "users",
        icon: (
          <Icon>
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 19.5c1.5-3 4-4.5 7-4.5s5.5 1.5 7 4.5" />
          </Icon>
        ),
      },
      {
        href: "/admin/roles",
        label: "Roles",
        flag: "roles",
        icon: (
          <Icon>
            <path d="M12 3 4.5 6.5v5c0 4.5 3.2 7.8 7.5 9 4.3-1.2 7.5-4.5 7.5-9v-5L12 3Z" />
            <path d="m9.5 12 1.7 1.7 3.3-3.4" />
          </Icon>
        ),
      },
    ],
  },
  {
    id: "content",
    label: "Content",
    items: [
      {
        href: "/admin/articles",
        label: "Articles",
        flag: "editorial",
        icon: (
          <Icon>
            <path d="M7 4h10a2 2 0 0 1 2 2v14l-3-2-3 2-3-2-3 2V6a2 2 0 0 1 2-2Z" />
            <path d="M9 9h6M9 13h6" />
          </Icon>
        ),
      },
      {
        href: "/admin/categories",
        label: "Categories",
        flag: "editorial",
        icon: (
          <Icon>
            <path d="M4 7h6l2 2h8v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7Z" />
          </Icon>
        ),
      },
      {
        href: "/admin/media",
        label: "Media",
        flag: "editorial",
        icon: (
          <Icon>
            <rect x="3" y="5" width="18" height="14" rx="2" />
            <circle cx="9" cy="11" r="2" />
            <path d="m21 15-4.5-4.5L9 18" />
          </Icon>
        ),
      },
      {
        href: "/admin/pages",
        label: "Pages",
        flag: "site",
        icon: (
          <Icon>
            <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
            <path d="M14 3v5h5" />
          </Icon>
        ),
      },
      {
        href: "/admin/templates",
        label: "Templates",
        flag: "site",
        icon: (
          <Icon>
            <rect x="4" y="4" width="7" height="7" rx="1" />
            <rect x="13" y="4" width="7" height="7" rx="1" />
            <rect x="4" y="13" width="7" height="7" rx="1" />
            <path d="M13 16h7M16.5 13v7" />
          </Icon>
        ),
      },
      {
        href: "/admin/menu",
        label: "Menus",
        flag: "site",
        icon: (
          <Icon>
            <path d="M5 7h14M5 12h14M5 17h14" />
          </Icon>
        ),
      },
    ],
  },
];

function isActive(href: string, pathname: string) {
  if (href === "/admin") return pathname === "/admin";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function isLinkVisible(
  link: NavItem,
  flags: {
    showEditorial: boolean;
    showSite: boolean;
    showUsers: boolean;
    showRoles: boolean;
  },
) {
  if (link.flag === "editorial") return flags.showEditorial;
  if (link.flag === "site") return flags.showSite;
  if (link.flag === "users") return flags.showUsers;
  if (link.flag === "roles") return flags.showRoles;
  return true;
}

type Props = {
  showEditorial: boolean;
  showSite: boolean;
  showUsers: boolean;
  showRoles: boolean;
  userEmail?: string | null;
  signOutAction: () => Promise<void>;
};

export function AdminSidebar({
  showEditorial,
  showSite,
  showUsers,
  showRoles,
  userEmail,
  signOutAction,
}: Props) {
  const pathname = usePathname();
  const expanded = useSyncExternalStore(
    subscribeExpanded,
    getExpandedSnapshot,
    getExpandedServerSnapshot,
  );
  const [mobileOpen, setMobileOpen] = useState(false);

  function toggleExpanded() {
    setExpandedPreference(!expanded);
  }

  const visibleGroups = navGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((link) =>
        isLinkVisible(link, {
          showEditorial,
          showSite,
          showUsers,
          showRoles,
        }),
      ),
    }))
    .filter((group) => group.items.length > 0);

  const showLabels = expanded || mobileOpen;

  const nav = (
    <div className="flex h-full flex-col">
      <div
        className={`flex h-14 items-center border-b border-gray-200 px-3 ${
          showLabels ? "justify-between gap-2" : "justify-center"
        }`}
      >
        {showLabels ? (
          <Link
            href="/admin"
            onClick={() => setMobileOpen(false)}
            className="truncate font-semibold tracking-tight"
          >
            VARC Admin
          </Link>
        ) : null}
        <button
          type="button"
          onClick={toggleExpanded}
          className="hidden h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 lg:inline-flex"
          aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
          title={expanded ? "Collapse" : "Expand"}
        >
          <Icon>
            {expanded ? (
              <path d="M15 6 9 12l6 6" />
            ) : (
              <path d="m9 6 6 6-6 6" />
            )}
          </Icon>
        </button>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-600 hover:bg-gray-50 lg:hidden"
          aria-label="Close menu"
        >
          <Icon>
            <path d="M6 6l12 12M18 6 6 18" />
          </Icon>
        </button>
      </div>

      <nav className="flex-1 space-y-4 overflow-y-auto p-2">
        {visibleGroups.map((group) => (
          <div key={group.id} className="space-y-1">
            {group.label ? (
              showLabels ? (
                <p className="px-2.5 pt-1 pb-1 text-[10px] font-semibold tracking-[0.16em] text-gray-400 uppercase">
                  {group.label}
                </p>
              ) : (
                <div className="mx-2 my-2 border-t border-gray-200" aria-hidden />
              )
            ) : null}
            {group.items.map((link) => {
              const active = !link.external && isActive(link.href, pathname);
              const className = `flex items-center gap-3 rounded-md px-2.5 py-2 text-sm transition ${
                showLabels ? "" : "justify-center"
              } ${
                active
                  ? "bg-gray-900 text-white"
                  : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
              }`;

              if (link.external) {
                return (
                  <a
                    key={link.href}
                    href={link.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={link.label}
                    onClick={() => setMobileOpen(false)}
                    className={className}
                  >
                    {link.icon}
                    {showLabels ? <span className="truncate">{link.label}</span> : null}
                  </a>
                );
              }

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={link.label}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setMobileOpen(false)}
                  className={className}
                >
                  {link.icon}
                  {showLabels ? (
                    <span className="truncate">{link.label}</span>
                  ) : null}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="space-y-2 border-t border-gray-200 p-2">
        {showLabels && userEmail ? (
          <p className="truncate px-2.5 text-xs text-gray-500" title={userEmail}>
            {userEmail}
          </p>
        ) : null}

        <form action={signOutAction}>
          <button
            type="submit"
            title="Sign out"
            className={`flex w-full cursor-pointer items-center gap-3 rounded-md border border-gray-200 px-2.5 py-2 text-sm text-gray-700 transition hover:bg-gray-50 ${
              showLabels ? "" : "justify-center"
            }`}
          >
            <Icon>
              <path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" />
              <path d="m15 16 4-4-4-4" />
              <path d="M10 12h9" />
            </Icon>
            {showLabels ? <span>Sign out</span> : null}
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-white px-4 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="inline-flex h-9 w-9 cursor-pointer items-center justify-center rounded-md border border-gray-200 text-gray-700 hover:bg-gray-50"
          aria-label="Open menu"
        >
          <Icon>
            <path d="M4 7h16M4 12h16M4 17h16" />
          </Icon>
        </button>
        <Link href="/admin" className="font-semibold tracking-tight">
          VARC Admin
        </Link>
      </div>

      {mobileOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          aria-label="Close menu overlay"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 border-r border-gray-200 bg-white transition-[transform,width] duration-200 ease-out lg:translate-x-0 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        } ${expanded ? "lg:w-64" : "lg:w-[4.5rem]"}`}
      >
        {nav}
      </aside>
      {/* Reserve horizontal space so main content isn't under the fixed sidebar */}
      <div
        className={`hidden shrink-0 lg:block ${
          expanded ? "lg:w-64" : "lg:w-[4.5rem]"
        }`}
        aria-hidden
      />
    </>
  );
}
