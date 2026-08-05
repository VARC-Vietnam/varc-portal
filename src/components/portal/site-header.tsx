"use client";

import { useEffect, useId, useRef, useState } from "react";
import NextLink from "next/link";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { PublicMenuLink } from "@/lib/cms";
import {
  SiteAccountMenu,
  type SiteAccountUser,
} from "@/components/portal/site-account-menu";

export type SiteHeaderBranding = {
  siteName: string;
  logoUrl?: string;
};

function MenuAnchor({
  item,
  className,
}: {
  item: PublicMenuLink;
  className?: string;
}) {
  if (item.kind === "page" && item.slug) {
    return (
      <Link
        href={{
          pathname: "/pages/[slug]",
          params: { slug: item.slug },
        }}
        locale={item.linkLocale}
        className={className}
        target={item.openInNewTab ? "_blank" : undefined}
        rel={item.openInNewTab ? "noopener noreferrer" : undefined}
      >
        {item.label}
      </Link>
    );
  }

  const href = item.href || "/";
  const external = /^https?:\/\//i.test(href);

  if (external || item.openInNewTab) {
    return (
      <a
        href={href}
        className={className}
        target={item.openInNewTab || external ? "_blank" : undefined}
        rel={item.openInNewTab || external ? "noopener noreferrer" : undefined}
      >
        {item.label}
      </a>
    );
  }

  return (
    <NextLink href={href} className={className}>
      {item.label}
    </NextLink>
  );
}

function NavDropdown({
  item,
  depth = 0,
}: {
  item: PublicMenuLink;
  depth?: number;
}) {
  const menuId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const children = item.children ?? [];
  const nested = depth > 0;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={rootRef}
      className={
        nested
          ? "relative"
          : "relative flex h-16 shrink-0 items-center"
      }
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((prev) => !prev)}
        className={
          nested
            ? "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm text-muted transition hover:bg-foreground/5 hover:text-foreground"
            : "inline-flex items-center gap-1 text-muted transition hover:text-foreground"
        }
      >
        {item.label}
        <svg
          viewBox="0 0 24 24"
          className={`h-3.5 w-3.5 shrink-0 transition ${
            open
              ? nested
                ? "-rotate-90"
                : "rotate-180"
              : nested
                ? "rotate-90"
                : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 10 6 6 6-6" />
        </svg>
      </button>
      {open ? (
        <div
          id={menuId}
          role="menu"
          className={
            nested
              ? "absolute top-0 left-full z-[60] min-w-[12rem] pl-1"
              : "absolute top-full left-0 z-[60] min-w-[12rem] pt-1"
          }
        >
          <div className="rounded-md border border-border bg-surface py-1 shadow-lg">
            {children.map((child) =>
              child.children && child.children.length > 0 ? (
                <NavDropdown key={child.id} item={child} depth={depth + 1} />
              ) : (
                <MenuAnchor
                  key={child.id}
                  item={child}
                  className="block px-3 py-2 text-sm text-muted transition hover:bg-foreground/5 hover:text-foreground"
                />
              ),
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function SiteHeader({
  menuItems = [],
  user = null,
  branding,
}: {
  menuItems?: PublicMenuLink[];
  user?: SiteAccountUser | null;
  branding: SiteHeaderBranding;
}) {
  const t = useTranslations("nav");

  return (
    <header className="relative z-50 border-b border-border/80 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 font-display text-xl tracking-tight text-foreground"
        >
          {branding.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote/data URLs from CMS
            <img
              src={branding.logoUrl}
              alt=""
              className="h-8 w-auto max-w-[9rem] object-contain"
            />
          ) : null}
          <span>{branding.siteName}</span>
        </Link>
        {/* No overflow here — it clips absolutely positioned dropdowns. */}
        <nav className="flex min-w-0 items-center gap-4 text-sm md:gap-5">
          <Link
            href="/"
            className="shrink-0 text-muted transition hover:text-foreground"
          >
            {t("home")}
          </Link>
          {menuItems.map((item) =>
            item.children && item.children.length > 0 ? (
              <NavDropdown key={item.id} item={item} />
            ) : (
              <MenuAnchor
                key={item.id}
                item={item}
                className="shrink-0 text-muted transition hover:text-foreground"
              />
            ),
          )}
          <SiteAccountMenu user={user} />
        </nav>
      </div>
    </header>
  );
}
