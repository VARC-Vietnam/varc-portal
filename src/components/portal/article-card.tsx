import { Link } from "@/i18n/navigation";
import type { PublicArticleCard } from "@/lib/articles";
import { coverFocusObjectPosition } from "@/lib/cover-focus";
import { formatDateUtc7 } from "@/lib/datetime-local";
import type { AppLocale } from "@/i18n/routing";

type Variant = "lead" | "support" | "grid";

type Props = {
  article: PublicArticleCard;
  locale: AppLocale;
  variant: Variant;
  labels: {
    readMore: string;
    publishedAt: string;
  };
};

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return null;
  return formatDateUtc7(value, locale === "vi" ? "vi-VN" : "en-GB");
}

function Cover({
  src,
  alt,
  className,
  focus,
}: {
  src: string;
  alt: string;
  className: string;
  focus?: Parameters<typeof coverFocusObjectPosition>[0];
}) {
  if (src) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          objectPosition: coverFocusObjectPosition(focus ?? { x: 15, y: 15, width: 70, height: 70 }),
        }}
      />
    );
  }

  return (
    <div
      className={`${className} bg-[radial-gradient(circle_at_30%_20%,var(--accent-soft),transparent_55%),linear-gradient(145deg,#e7efe9,#d5e4db)]`}
      aria-hidden
    />
  );
}

export function ArticleCard({ article, locale, variant, labels }: Props) {
  const dateLabel = formatDate(article.publishedAt, locale);
  const href = {
    pathname: "/news/[slug]" as const,
    params: { slug: article.slug },
  };

  if (variant === "lead") {
    return (
      <Link href={href} className="group block h-full">
        <article className="flex h-full flex-col">
          <div className="relative aspect-[16/10] overflow-hidden md:aspect-[5/3]">
            <Cover
              src={article.coverImageUrl}
              alt=""
              focus={article.coverImageFocus}
              className="h-full w-full object-cover transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.03]"
            />
          </div>
          <div className="flex flex-1 flex-col pt-6">
            {dateLabel ? (
              <time
                dateTime={article.publishedAt ?? undefined}
                className="text-xs tracking-wide text-muted uppercase"
              >
                {labels.publishedAt} {dateLabel}
              </time>
            ) : null}
            <h3 className="mt-2 font-display text-3xl leading-tight text-foreground transition duration-500 group-hover:text-accent md:text-4xl">
              {article.title}
            </h3>
            {article.excerpt ? (
              <p className="mt-3 w-full text-base leading-relaxed text-muted">
                {article.excerpt}
              </p>
            ) : null}
            <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent">
              {labels.readMore}
              <span
                aria-hidden
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px"
              >
                ↗
              </span>
            </span>
          </div>
        </article>
      </Link>
    );
  }

  if (variant === "support") {
    return (
      <Link href={href} className="group block">
        <article className="grid grid-cols-[7.5rem_minmax(0,1fr)] gap-4 sm:grid-cols-[9rem_minmax(0,1fr)]">
          <div className="aspect-[4/3] overflow-hidden sm:aspect-square">
            <Cover
              src={article.coverImageUrl}
              alt=""
              focus={article.coverImageFocus}
              className="h-full w-full object-cover transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.03]"
            />
          </div>
          <div className="flex min-w-0 flex-col justify-center py-0.5">
            {dateLabel ? (
              <time
                dateTime={article.publishedAt ?? undefined}
                className="text-xs text-muted"
              >
                {dateLabel}
              </time>
            ) : null}
            <h3 className="mt-1 font-display text-xl leading-snug text-foreground transition duration-500 group-hover:text-accent md:text-2xl">
              {article.title}
            </h3>
            {article.excerpt ? (
              <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
                {article.excerpt}
              </p>
            ) : null}
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={href} className="group block h-full">
      <article className="flex h-full flex-col">
        <div className="aspect-[16/10] overflow-hidden">
          <Cover
            src={article.coverImageUrl}
            alt=""
            focus={article.coverImageFocus}
            className="h-full w-full object-cover transition duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:scale-[1.03]"
          />
        </div>
        <div className="flex flex-1 flex-col pt-4">
          {dateLabel ? (
            <time
              dateTime={article.publishedAt ?? undefined}
              className="text-xs text-muted"
            >
              {dateLabel}
            </time>
          ) : null}
          <h3 className="mt-1.5 font-display text-xl leading-snug text-foreground transition duration-500 group-hover:text-accent md:text-2xl">
            {article.title}
          </h3>
          {article.excerpt ? (
            <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">
              {article.excerpt}
            </p>
          ) : null}
        </div>
      </article>
    </Link>
  );
}
