"use client";

import { useCallback, useEffect, useEffectEvent, useState } from "react";
import { Link } from "@/i18n/navigation";
import type { PublicArticleCard } from "@/lib/articles";
import { FocusedCoverImage } from "@/components/portal/focused-cover-image";
import { formatDateUtc7 } from "@/lib/datetime-local";
import type { AppLocale } from "@/i18n/routing";

type Props = {
  articles: PublicArticleCard[];
  locale: AppLocale;
  siteName: string;
  labels: {
    featuredLabel: string;
    readMore: string;
    publishedAt: string;
    previous: string;
    next: string;
  };
};

const FADE_TRANSITION =
  "opacity 800ms cubic-bezier(0.32, 0.72, 0, 1)";

function formatDate(value: string | null, locale: AppLocale) {
  if (!value) return null;
  return formatDateUtc7(value, locale === "vi" ? "vi-VN" : "en-GB");
}

export function HomeFeaturedSlider({
  articles,
  locale,
  siteName,
  labels,
}: Props) {
  const [index, setIndex] = useState(0);
  const count = articles.length;

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      const target = ((next % count) + count) % count;
      setIndex((current) => (current === target ? current : target));
    },
    [count],
  );

  const onAutoAdvance = useEffectEvent(() => {
    goTo(index + 1);
  });

  useEffect(() => {
    if (count <= 1) return;
    const id = window.setInterval(() => onAutoAdvance(), 6500);
    return () => window.clearInterval(id);
  }, [count, index]);

  if (count === 0) return null;

  return (
    <section className="relative overflow-hidden border-b border-border bg-foreground text-surface">
      <div className="relative min-h-[42dvh] md:min-h-[48dvh]">
        {articles.map((article, i) => {
          const active = i === index;
          return (
            <div
              key={`cover-${article.id}`}
              aria-hidden={!active}
              className="absolute inset-0 overflow-hidden"
              style={{
                opacity: active ? 1 : 0,
                transition: FADE_TRANSITION,
                pointerEvents: active ? "auto" : "none",
                zIndex: active ? 1 : 0,
              }}
            >
              {article.coverImageUrl ? (
                <FocusedCoverImage
                  src={article.coverImageUrl}
                  focus={article.coverImageFocus}
                  className="absolute inset-0 h-full w-full"
                  mode="fill"
                />
              ) : (
                <div
                  className="h-full w-full bg-[radial-gradient(circle_at_20%_15%,#3d7a5c,transparent_45%),linear-gradient(145deg,#1a3328,#0f1c16)]"
                  aria-hidden
                />
              )}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-black/15"
              />
            </div>
          );
        })}

        <div className="relative z-10 mx-auto flex min-h-[42dvh] max-w-6xl flex-col justify-end px-4 pb-10 pt-20 md:min-h-[48dvh] md:px-6 md:pb-12">
          <p className="font-display text-2xl tracking-tight text-white/90 md:text-3xl">
            {siteName}
          </p>
          <p className="mt-4 text-[10px] font-medium tracking-[0.22em] text-accent-soft uppercase">
            {labels.featuredLabel}
          </p>

          {/* Grid stack: cell height = tallest slide, so copy never overflows onto controls. */}
          <div className="mt-2 grid">
            {articles.map((article, i) => {
              const active = i === index;
              const dateLabel = formatDate(article.publishedAt, locale);
              return (
                <div
                  key={`copy-${article.id}`}
                  aria-hidden={!active}
                  className="col-start-1 row-start-1"
                  style={{
                    opacity: active ? 1 : 0,
                    transition: FADE_TRANSITION,
                    pointerEvents: active ? "auto" : "none",
                    zIndex: active ? 1 : 0,
                  }}
                >
                  <Link
                    href={{
                      pathname: "/news/[slug]",
                      params: { slug: article.slug },
                    }}
                    className="group block max-w-3xl"
                    tabIndex={active ? 0 : -1}
                  >
                    {dateLabel ? (
                      <time
                        dateTime={article.publishedAt ?? undefined}
                        className="text-xs tracking-wide text-white/65 uppercase"
                      >
                        {labels.publishedAt} {dateLabel}
                      </time>
                    ) : null}
                    <h1 className="mt-2 font-display text-2xl leading-[1.15] text-white transition duration-500 group-hover:text-accent-soft md:text-4xl lg:text-5xl">
                      {article.title}
                    </h1>
                    {article.excerpt ? (
                      <p className="mt-3 max-w-[48ch] text-sm leading-relaxed text-white/75 md:text-base line-clamp-2">
                        {article.excerpt}
                      </p>
                    ) : null}
                    <span className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-accent-soft">
                      {labels.readMore}
                      <span
                        aria-hidden
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-white/10 transition duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] group-hover:translate-x-0.5 group-hover:-translate-y-px"
                      >
                        ↗
                      </span>
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>

          {count > 1 ? (
            <div className="relative z-20 mt-8 flex items-center gap-4">
              <div className="flex shrink-0 gap-2">
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  aria-label={labels.previous}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  aria-label={labels.next}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white backdrop-blur-sm transition hover:bg-white/15"
                >
                  →
                </button>
              </div>
              <div className="flex items-center gap-2" role="tablist">
                {articles.map((article, i) => (
                  <button
                    key={article.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={`${i + 1} / ${count}`}
                    onClick={() => goTo(i)}
                    className={`h-1.5 rounded-full transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
                      i === index
                        ? "w-8 bg-accent-soft"
                        : "w-1.5 bg-white/35 hover:bg-white/60"
                    }`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
