"use client";

import { useParams } from "next/navigation";
import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

function FlagVN({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 30 20"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <rect
        x="0.5"
        y="0.5"
        width="29"
        height="19"
        rx="1"
        stroke="currentColor"
        strokeWidth="1"
      />
      <polygon
        fill="currentColor"
        points="15,5 16.3,9 20.5,9 17.1,11.5 18.4,15.5 15,13 11.6,15.5 12.9,11.5 9.5,9 13.7,9"
      />
    </svg>
  );
}

function FlagGB({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 30 20"
      className={className}
      aria-hidden="true"
      focusable="false"
      fill="none"
    >
      <rect
        x="0.5"
        y="0.5"
        width="29"
        height="19"
        rx="1"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M0.5 0.5 L29.5 19.5 M29.5 0.5 L0.5 19.5"
        stroke="currentColor"
        strokeWidth="1"
      />
      <path
        d="M15 0.5 V19.5 M0.5 10 H29.5"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <path
        d="M15 0.5 V19.5 M0.5 10 H29.5"
        stroke="currentColor"
        strokeWidth="1"
        opacity="0.35"
      />
    </svg>
  );
}

function buildHref(
  pathname: string,
  params: Record<string, string | string[] | undefined>,
) {
  const dynamicParams = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "locale"),
  );

  if (Object.keys(dynamicParams).length === 0) {
    return pathname as "/";
  }

  return {
    pathname: pathname as "/news/[slug]" | "/pages/[slug]",
    params: dynamicParams as { slug: string },
  };
}

export function LanguageSwitcher({
  align = "end",
}: {
  align?: "start" | "end";
}) {
  const locale = useLocale();
  const pathname = usePathname();
  const params = useParams();
  const href = buildHref(pathname, params);

  return (
    <div
      className={`flex items-start gap-1.5 ${
        align === "end" ? "justify-end" : "justify-start"
      }`}
      role="navigation"
      aria-label="Language"
    >
      <Link
        href={href}
        locale="vi"
        aria-label="Tiếng Việt"
        aria-current={locale === "vi" ? "true" : undefined}
        title="Tiếng Việt"
        className={`inline-flex text-foreground transition ${
          locale === "vi" ? "opacity-100" : "opacity-40 hover:opacity-80"
        }`}
      >
        <FlagVN className="h-3.5 w-5" />
      </Link>
      <Link
        href={href}
        locale="en"
        aria-label="English"
        aria-current={locale === "en" ? "true" : undefined}
        title="English"
        className={`inline-flex text-foreground transition ${
          locale === "en" ? "opacity-100" : "opacity-40 hover:opacity-80"
        }`}
      >
        <FlagGB className="h-3.5 w-5" />
      </Link>
    </div>
  );
}
