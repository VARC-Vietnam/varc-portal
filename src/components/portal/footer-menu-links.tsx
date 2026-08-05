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

function splitIntoColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    columns[index % columnCount]?.push(item);
  });
  return columns;
}

export function FooterMenuLinks({
  items,
  columns = 4,
}: {
  items: PublicMenuLink[];
  columns?: number;
}) {
  const linkClass = "block text-muted transition hover:text-foreground";
  const groups = splitIntoColumns(items, columns);

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 md:grid-cols-3">
      {groups.map((group, columnIndex) => (
        <div key={columnIndex} className="flex flex-col gap-2">
          {group.map((item) => (
            <MenuItem key={item.id} item={item} className={linkClass} />
          ))}
        </div>
      ))}
    </div>
  );
}
