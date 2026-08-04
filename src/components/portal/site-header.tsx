"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

type NavPage = {
  id: string;
  title: string;
  slug: string;
  linkLocale: AppLocale;
};

export function SiteHeader({ navPages = [] }: { navPages?: NavPage[] }) {
  const t = useTranslations("nav");
  const tSite = useTranslations("site");

  return (
    <header className="border-b border-border/80 bg-surface/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 md:px-6">
        <Link href="/" className="font-display text-xl tracking-tight text-foreground">
          {tSite("name")}
        </Link>
        <nav className="flex items-center gap-4 overflow-x-auto text-sm md:gap-5">
          <Link href="/" className="shrink-0 text-muted transition hover:text-foreground">
            {t("home")}
          </Link>
          {navPages.map((page) => (
            <Link
              key={page.id}
              href={{
                pathname: "/pages/[slug]",
                params: { slug: page.slug },
              }}
              locale={page.linkLocale}
              className="shrink-0 text-muted transition hover:text-foreground"
            >
              {page.title}
            </Link>
          ))}
          <a
            href="/admin"
            className="shrink-0 text-muted transition hover:text-foreground"
          >
            {t("admin")}
          </a>
        </nav>
      </div>
    </header>
  );
}
