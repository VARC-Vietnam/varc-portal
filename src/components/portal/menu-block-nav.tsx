"use client";

import { useEffect, useId, useRef, useState } from "react";
import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import type { PublicMenuLink } from "@/lib/cms";

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

  if (item.kind === "category" && item.slug) {
    return (
      <Link
        href={{
          pathname: "/categories/[slug]",
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
      className="relative"
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
            : "inline-flex items-center gap-1 text-sm text-muted transition hover:text-foreground"
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

function MobileItem({
  item,
  depth = 0,
}: {
  item: PublicMenuLink;
  depth?: number;
}) {
  const [open, setOpen] = useState(false);
  const children = item.children ?? [];
  const hasChildren = children.length > 0;
  const pad = depth === 0 ? "px-0" : depth === 1 ? "pl-4" : "pl-8";

  if (!hasChildren) {
    return (
      <MenuAnchor
        item={item}
        className={`block ${pad} py-2 text-sm text-foreground transition hover:text-accent`}
      />
    );
  }

  return (
    <div className={pad}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm text-foreground"
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
        <div className="border-l border-border pb-1">
          {children.map((child) => (
            <MobileItem key={child.id} item={child} depth={depth + 1} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

/** Nested menu for template blocks — popups on desktop, accordion on mobile. */
export function MenuBlockNav({ items }: { items: PublicMenuLink[] }) {
  if (!items.length) return null;

  return (
    <nav aria-label="Menu">
      <div className="hidden flex-wrap items-center gap-x-5 gap-y-2 md:flex">
        {items.map((item) =>
          item.children && item.children.length > 0 ? (
            <NavDropdown key={item.id} item={item} />
          ) : (
            <MenuAnchor
              key={item.id}
              item={item}
              className="text-sm text-muted transition hover:text-foreground"
            />
          ),
        )}
      </div>
      <div className="space-y-1 md:hidden">
        {items.map((item) => (
          <MobileItem key={item.id} item={item} />
        ))}
      </div>
    </nav>
  );
}
