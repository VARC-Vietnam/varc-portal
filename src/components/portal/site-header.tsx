"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
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
  onNavigate,
}: {
  item: PublicMenuLink;
  className?: string;
  onNavigate?: () => void;
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
        onClick={onNavigate}
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
        onClick={onNavigate}
      >
        {item.label}
      </a>
    );
  }

  return (
    <NextLink href={href} className={className} onClick={onNavigate}>
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

function MobileNavItem({
  item,
  depth = 0,
  onNavigate,
}: {
  item: PublicMenuLink;
  depth?: number;
  onNavigate: () => void;
}) {
  const [open, setOpen] = useState(false);
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const pad = depth === 0 ? "px-4" : depth === 1 ? "pl-8 pr-4" : "pl-12 pr-4";

  if (!hasChildren) {
    return (
      <MenuAnchor
        item={item}
        onNavigate={onNavigate}
        className={`block ${pad} py-3 text-base text-foreground transition hover:bg-foreground/5`}
      />
    );
  }

  return (
    <div>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={`flex w-full items-center justify-between gap-2 ${pad} py-3 text-left text-base text-foreground transition hover:bg-foreground/5`}
      >
        <span>{item.label}</span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-muted transition ${open ? "rotate-180" : ""}`}
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
        <div className="border-t border-border/60 bg-foreground/[0.02]">
          {children.map((child) => (
            <MobileNavItem
              key={child.id}
              item={child}
              depth={depth + 1}
              onNavigate={onNavigate}
            />
          ))}
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
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setMobileOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mobileOpen]);

  function closeMobile() {
    setMobileOpen(false);
  }

  return (
    <>
      <header className="relative z-50 border-b border-border/80 bg-surface/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 md:px-6">
          <Link
            href="/"
            className="flex min-w-0 shrink items-center gap-2.5 font-display text-xl tracking-tight text-foreground"
            onClick={closeMobile}
          >
            {branding.logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- remote/data URLs from CMS
              <img
                src={branding.logoUrl}
                alt=""
                className="h-8 w-auto max-w-[7rem] shrink-0 object-contain sm:max-w-[9rem]"
              />
            ) : null}
            <span className="truncate">{branding.siteName}</span>
          </Link>

          {/* Desktop navigation */}
          <nav className="hidden min-w-0 items-center gap-4 text-sm lg:flex lg:gap-5">
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

          {/* Mobile controls */}
          <div className="flex shrink-0 items-center gap-2 lg:hidden">
            <SiteAccountMenu user={user} compact />
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-foreground/5"
              aria-label={t("openMenu")}
              aria-expanded={mobileOpen}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M4 7h16M4 12h16M4 17h16" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {mobileOpen
        ? createPortal(
            <>
              <button
                type="button"
                className="fixed inset-0 z-[60] bg-black/40 lg:hidden"
                aria-label={t("closeMenu")}
                onClick={closeMobile}
              />
              <div
                className="fixed inset-y-0 right-0 z-[70] flex w-[min(20rem,88vw)] flex-col border-l border-border bg-surface shadow-xl lg:hidden"
                role="dialog"
                aria-modal="true"
                aria-label={t("menu")}
              >
                <div className="flex h-16 shrink-0 items-center justify-between gap-3 border-b border-border px-4">
                  <p className="truncate font-display text-lg text-foreground">
                    {t("menu")}
                  </p>
                  <button
                    type="button"
                    onClick={closeMobile}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-foreground transition hover:bg-foreground/5"
                    aria-label={t("closeMenu")}
                  >
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.75"
                      strokeLinecap="round"
                      aria-hidden
                    >
                      <path d="M6 6l12 12M18 6 6 18" />
                    </svg>
                  </button>
                </div>

                <nav className="min-h-0 flex-1 overflow-y-auto py-2">
                  <Link
                    href="/"
                    onClick={closeMobile}
                    className="block px-4 py-3 text-base text-foreground transition hover:bg-foreground/5"
                  >
                    {t("home")}
                  </Link>
                  {menuItems.map((item) => (
                    <MobileNavItem
                      key={item.id}
                      item={item}
                      onNavigate={closeMobile}
                    />
                  ))}
                </nav>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
