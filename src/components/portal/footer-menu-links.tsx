"use client";

import NextLink from "next/link";
import { Link } from "@/i18n/navigation";
import type { PublicMenuLink } from "@/lib/cms";

function MenuItem({
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
        rel={
          item.openInNewTab || external ? "noopener noreferrer" : undefined
        }
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

export function FooterMenuLinks({ items }: { items: PublicMenuLink[] }) {
  const linkClass =
    "text-muted transition hover:text-foreground sm:whitespace-nowrap";
  const flat: PublicMenuLink[] = [];
  function walk(nodes: PublicMenuLink[]) {
    for (const item of nodes) {
      flat.push(item);
      if (item.children?.length) walk(item.children);
    }
  }
  walk(items);

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end sm:gap-x-5 md:flex-nowrap">
      {flat.map((item) => (
        <MenuItem key={item.id} item={item} className={linkClass} />
      ))}
    </div>
  );
}
