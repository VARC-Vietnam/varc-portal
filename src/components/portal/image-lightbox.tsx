"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";

export type LightboxImage = {
  id: string;
  url: string;
  alt: string;
};

type Props = {
  images: LightboxImage[];
  index: number;
  title?: string;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

export function ImageLightbox({
  images,
  index,
  title,
  onClose,
  onIndexChange,
}: Props) {
  const t = useTranslations("page");
  const safeIndex =
    images.length === 0 ? 0 : Math.min(Math.max(index, 0), images.length - 1);
  const current = images[safeIndex] ?? null;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
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

      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }

      if (images.length === 0) return;

      if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
        event.preventDefault();
        if (event.key === "ArrowLeft") {
          onIndexChange((safeIndex - 1 + images.length) % images.length);
        } else {
          onIndexChange((safeIndex + 1) % images.length);
        }
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [images.length, onClose, onIndexChange, safeIndex]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-transparent text-white"
      role="dialog"
      aria-modal="true"
      aria-label={title || t("galleryThumbnails")}
    >
      {/* Theater scrim — translucent so the article remains visible behind */}
      <button
        type="button"
        aria-label={t("galleryClose")}
        className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <header className="relative z-10 flex shrink-0 items-center justify-between gap-4 bg-gradient-to-b from-black/50 to-transparent px-4 py-3 md:px-6">
        <div className="min-w-0">
          {title ? (
            <p className="truncate font-display text-lg leading-tight drop-shadow md:text-xl">
              {title}
            </p>
          ) : null}
          {images.length > 0 ? (
            <p
              className={`text-xs text-white/80 drop-shadow ${title ? "mt-0.5" : ""}`}
            >
              <span>
                {safeIndex + 1} / {images.length}
              </span>
              {current?.alt ? (
                <span className="mt-0.5 block truncate sm:mt-0 sm:ml-2 sm:inline">
                  {current.alt}
                </span>
              ) : null}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          {images.length > 1 ? (
            <p className="hidden text-xs text-white/70 drop-shadow sm:block">
              {t("galleryKeyboardHint")}
            </p>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/25 bg-black/30 px-3 py-1.5 text-sm text-white backdrop-blur-sm hover:bg-black/45"
          >
            {t("galleryClose")}
          </button>
        </div>
      </header>

      <div
        className="relative z-10 min-h-0 flex-1 cursor-zoom-out"
        onClick={onClose}
      >
        {images.length === 0 ? (
          <div className="flex h-full items-center justify-center px-4 text-sm text-white/80">
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
                className="max-h-full max-w-full cursor-default object-contain drop-shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              />
            </div>

            {images.length > 1 ? (
              <>
                <button
                  type="button"
                  aria-label={t("galleryPrevious")}
                  onClick={(event) => {
                    event.stopPropagation();
                    onIndexChange(
                      (safeIndex - 1 + images.length) % images.length,
                    );
                  }}
                  className="absolute left-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-black/35 px-3 py-3 text-lg text-white backdrop-blur-sm hover:bg-black/55 md:left-5"
                >
                  ←
                </button>
                <button
                  type="button"
                  aria-label={t("galleryNext")}
                  onClick={(event) => {
                    event.stopPropagation();
                    onIndexChange((safeIndex + 1) % images.length);
                  }}
                  className="absolute right-3 top-1/2 z-20 -translate-y-1/2 rounded-full border border-white/25 bg-black/35 px-3 py-3 text-lg text-white backdrop-blur-sm hover:bg-black/55 md:right-5"
                >
                  →
                </button>
              </>
            ) : null}
          </>
        )}
      </div>

      {images.length > 1 ? (
        <div className="relative z-10 shrink-0 bg-gradient-to-t from-black/50 to-transparent px-3 py-3 md:px-6">
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
                  onClick={() => onIndexChange(imageIndex)}
                  className={`relative h-16 w-24 shrink-0 overflow-hidden rounded border shadow-lg transition md:h-20 md:w-28 ${
                    selected
                      ? "border-white ring-2 ring-white/50"
                      : "border-white/30 opacity-75 hover:opacity-100"
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
