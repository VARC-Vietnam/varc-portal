"use client";

import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import type { PublicMenuLink } from "@/lib/cms";

export function FooterMenuLinks({ items }: { items: PublicMenuLink[] }) {
  return (
    <>
      {items.map((item) => {
        const className = "text-muted transition hover:text-foreground";

        if (item.kind === "page" && item.slug) {
          return (
            <Link
              key={item.id}
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
              key={item.id}
              href={href}
              className={className}
              target={item.openInNewTab || external ? "_blank" : undefined}
              rel={
                item.openInNewTab || external
                  ? "noopener noreferrer"
                  : undefined
              }
            >
              {item.label}
            </a>
          );
        }

        return (
          <NextLink key={item.id} href={href} className={className}>
            {item.label}
          </NextLink>
        );
      })}
    </>
  );
}
