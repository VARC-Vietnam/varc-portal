"use client";

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
    <header className="border-b border-border/80 bg-surface/90 backdrop-blur-md">
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
        <nav className="flex items-center gap-4 overflow-x-auto text-sm md:gap-5">
          <Link href="/" className="shrink-0 text-muted transition hover:text-foreground">
            {t("home")}
          </Link>
          {menuItems.map((item) => (
            <MenuAnchor
              key={item.id}
              item={item}
              className="shrink-0 text-muted transition hover:text-foreground"
            />
          ))}
          <SiteAccountMenu user={user} />
        </nav>
      </div>
    </header>
  );
}
