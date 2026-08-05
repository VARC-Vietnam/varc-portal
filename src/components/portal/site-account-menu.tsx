"use client";

import { useState, useTransition } from "react";
import NextLink from "next/link";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useTranslations } from "next-intl";
import { signOutAction } from "@/lib/actions";

export type SiteAccountUser = {
  name: string | null;
  email: string | null;
  isAdmin: boolean;
};

export function SiteAccountMenu({ user }: { user: SiteAccountUser | null }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  if (!user) {
    return (
      <NextLink
        href="/admin/login"
        className="shrink-0 text-muted transition hover:text-foreground"
      >
        {t("login")}
      </NextLink>
    );
  }

  const displayName = user.name?.trim() || user.email || t("account");

  function toggleMenu() {
    setOpen((current) => !current);
  }

  function onLogout() {
    startTransition(async () => {
      await signOutAction();
    });
  }

  return (
    <DropdownMenu.Root open={open} onOpenChange={setOpen}>
      <div className="inline-flex max-w-[18rem] shrink-0 items-stretch overflow-hidden rounded-md">
        <button
          type="button"
          onClick={toggleMenu}
          className="min-w-0 flex-1 px-2.5 py-1.5 text-left outline-none transition hover:bg-foreground/5 focus-visible:bg-foreground/5"
          aria-expanded={open}
          aria-haspopup="menu"
        >
          <span className="block truncate text-sm font-medium leading-tight text-foreground">
            {displayName}
          </span>
          {user.email && user.name?.trim() ? (
            <span className="block truncate text-xs leading-tight text-muted">
              {user.email}
            </span>
          ) : null}
        </button>

        <DropdownMenu.Trigger asChild>
          <button
            type="button"
            className="flex items-center justify-center px-2 text-muted outline-none transition hover:bg-foreground/5 hover:text-foreground focus-visible:bg-foreground/5 data-[state=open]:bg-foreground/5"
            aria-label={t("accountMenu")}
          >
            <svg
              viewBox="0 0 16 16"
              className={`h-3.5 w-3.5 transition ${open ? "rotate-180" : ""}`}
              aria-hidden
              fill="none"
              stroke="currentColor"
              strokeWidth="1.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 6l4 4 4-4" />
            </svg>
          </button>
        </DropdownMenu.Trigger>
      </div>

      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align="end"
          sideOffset={8}
          className="z-50 min-w-[12rem] rounded-md border border-border bg-surface p-1 shadow-md outline-none"
        >
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-sm font-medium text-foreground">
              {displayName}
            </p>
            {user.email ? (
              <p className="truncate text-xs text-muted">{user.email}</p>
            ) : null}
          </div>

          {user.isAdmin ? (
            <DropdownMenu.Item asChild>
              <NextLink
                href="/admin"
                className="mt-1 flex cursor-pointer select-none items-center gap-2.5 rounded px-3 py-2 text-sm text-foreground outline-none transition hover:bg-foreground/5 data-[highlighted]:bg-foreground/5"
              >
                <svg
                  viewBox="0 0 16 16"
                  className="h-4 w-4 shrink-0 text-muted"
                  aria-hidden
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="2" y="2" width="5" height="5" rx="0.75" />
                  <rect x="9" y="2" width="5" height="5" rx="0.75" />
                  <rect x="2" y="9" width="5" height="5" rx="0.75" />
                  <rect x="9" y="9" width="5" height="5" rx="0.75" />
                </svg>
                {t("dashboard")}
              </NextLink>
            </DropdownMenu.Item>
          ) : null}

          <DropdownMenu.Separator className="my-1 h-px bg-border" />

          <DropdownMenu.Item
            disabled={pending}
            onSelect={(event) => {
              event.preventDefault();
              onLogout();
            }}
            className="flex cursor-pointer select-none items-center gap-2.5 rounded px-3 py-2 text-sm text-foreground outline-none transition hover:bg-foreground/5 data-[highlighted]:bg-foreground/5 data-[disabled]:opacity-50"
          >
            <svg
              viewBox="0 0 16 16"
              className="h-4 w-4 shrink-0 text-muted"
              aria-hidden
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M6 3H3.75A1.75 1.75 0 0 0 2 4.75v6.5C2 12.216 2.784 13 3.75 13H6" />
              <path d="M7 8h7" />
              <path d="M11.5 5.5 14 8l-2.5 2.5" />
            </svg>
            {pending ? "…" : t("logout")}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
