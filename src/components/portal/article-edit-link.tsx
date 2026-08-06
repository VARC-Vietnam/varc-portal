import NextLink from "next/link";

type Props = {
  href: string;
  label: string;
};

/** Admin-only shortcut from the public article page. */
export function ArticleEditLink({ href, label }: Props) {
  return (
    <NextLink
      href={href}
      className="inline-flex shrink-0 items-center gap-1.5 text-sm text-muted transition hover:text-foreground"
      aria-label={label}
      title={label}
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      <span>{label}</span>
    </NextLink>
  );
}
