"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

export type GalleryImage = {
  id: string;
  url: string;
  alt: string;
};

type Props = {
  images: GalleryImage[];
  title: string;
};

export function GalleryPageView({ images, title }: Props) {
  const t = useTranslations("page");
  const [index, setIndex] = useState(0);

  const safeIndex = images.length === 0 ? 0 : Math.min(index, images.length - 1);
  const current = images[safeIndex] ?? null;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (images.length === 0) return;

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((currentIndex) => {
          if (images.length === 0) return 0;
          if (event.key === "ArrowLeft") {
            return (currentIndex - 1 + images.length) % images.length;
          }
          return (currentIndex + 1) % images.length;
        });
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-black text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-white/10 px-4 py-3 md:px-6">
        <div className="min-w-0">
          <p className="truncate font-display text-lg leading-tight md:text-xl">
            {title}
          </p>
          {images.length > 0 ? (
            <p className="mt-0.5 text-xs text-white/60">
              {safeIndex + 1} / {images.length}
              {current?.alt ? (
                <span className="ml-2 text-white/80">{current.alt}</span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {images.length > 1 ? (
            <p className="hidden text-xs text-white/50 sm:block">
              {t("galleryKeyboardHint")}
            </p>
          ) : null}
          <Link
            href="/"
            className="rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/20"
          >
            {t("galleryClose")}
          </Link>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        {images.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-sm text-white/70">
            {t("galleryEmpty")}
          </div>
        ) : (
          <>
            <div className="flex h-full items-center justify-center px-4 py-4 md:px-16">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                key={current?.id ?? safeIndex}
                src={current?.url}
                alt={current?.alt || ""}
                className="max-h-full max-w-full object-contain"
              />
            </div>

            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label={t("galleryPrevious")}
                  onClick={() =>
                    setIndex(
                      (currentIndex) =>
                        (currentIndex - 1 + images.length) % images.length,
                    )
                  }
                  className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 px-3 py-3 text-lg text-white backdrop-blur hover:bg-black/70 md:left-5"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label={t("galleryNext")}
                  onClick={() =>
                    setIndex(
                      (currentIndex) => (currentIndex + 1) % images.length,
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-white/20 bg-black/50 px-3 py-3 text-lg text-white backdrop-blur hover:bg-black/70 md:right-5"
                >
                  →
                </button>
              </>
            ) : null}
          </>
        )}
      </div>

      {images.length > 0 ? (
        <div className="shrink-0 border-t border-white/10 bg-black/80 px-3 py-3 md:px-6">
          <div
            className="mx-auto flex max-w-6xl gap-2 overflow-x-auto pb-1"
            role="listbox"
            aria-label={t("galleryThumbnails")}
          >
            {images.map((image, imageIndex) => {
              const selected = imageIndex === safeIndex;
              return (
                <button
                  key={image.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => setIndex(imageIndex)}
                  className={`relative h-16 w-24 shrink-0 overflow-hidden rounded border transition md:h-20 md:w-28 ${
                    selected
                      ? "border-white ring-2 ring-white/40"
                      : "border-white/20 opacity-70 hover:opacity-100"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.alt || ""}
                    className="h-full w-full object-cover"
                  />
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
