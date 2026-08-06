"use client";

import { useMemo, useRef, useState, type MouseEvent } from "react";
import {
  extractContentImages,
  normalizeEditorHtml,
  sanitizeHtml,
  type ContentImage,
} from "@/lib/html";
import {
  coverFocusObjectPosition,
  normalizeCoverFocus,
  type CoverFocusRect,
} from "@/lib/cover-focus";
import { ImageLightbox } from "@/components/portal/image-lightbox";

type Props = {
  html: string;
  title?: string;
  coverImageUrl?: string;
  coverImageFocus?: CoverFocusRect | null;
  className?: string;
};

/** Normalize for matching: same-origin absolute → path; decode entities. */
function normalizeImageUrl(url: string): string {
  const trimmed = url
    .trim()
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"');
  if (!trimmed || trimmed.startsWith("data:")) return "";

  try {
    const base =
      typeof window !== "undefined"
        ? window.location.href
        : "http://localhost/";
    const parsed = new URL(trimmed, base);
    if (
      typeof window !== "undefined" &&
      parsed.origin === window.location.origin
    ) {
      return `${parsed.pathname}${parsed.search}`;
    }
    return parsed.href;
  } catch {
    return trimmed;
  }
}

function urlsMatch(a: string, b: string): boolean {
  const left = normalizeImageUrl(a);
  const right = normalizeImageUrl(b);
  return Boolean(left && right && left === right);
}

function mergeImages(
  coverUrl: string | undefined,
  contentImages: ContentImage[],
): ContentImage[] {
  const images: ContentImage[] = [];
  const seen = new Set<string>();

  function push(id: string, url: string, alt: string) {
    const key = normalizeImageUrl(url) || url.trim();
    if (!key || seen.has(key)) return;
    seen.add(key);
    images.push({ id, url: url.trim(), alt });
  }

  if (coverUrl?.trim()) {
    push("cover", coverUrl, "");
  }

  for (const image of contentImages) {
    push(image.id, image.url, image.alt);
  }

  return images;
}

function imagesFromDom(
  coverUrl: string | undefined,
  root: HTMLElement | null,
): ContentImage[] {
  const fromDom: ContentImage[] = [];
  if (root) {
    root.querySelectorAll("img").forEach((img, index) => {
      const url =
        img.getAttribute("src") ||
        img.currentSrc ||
        (img instanceof HTMLImageElement ? img.src : "") ||
        "";
      if (!url || url.startsWith("data:")) return;
      fromDom.push({
        id: `dom-${index}`,
        url,
        alt: img.getAttribute("alt") || "",
      });
    });
  }
  return mergeImages(coverUrl, fromDom);
}

export function ArticleBody({
  html,
  title,
  coverImageUrl,
  coverImageFocus,
  className = "prose-article-wide prose-article-lightbox mt-10",
}: Props) {
  const contentRef = useRef<HTMLDivElement>(null);
  const safe = useMemo(
    () => sanitizeHtml(normalizeEditorHtml(html)),
    [html],
  );
  const parsedImages = useMemo(
    () => mergeImages(coverImageUrl, extractContentImages(safe)),
    [coverImageUrl, safe],
  );
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeImages, setActiveImages] = useState<ContentImage[]>(parsedImages);

  function openTheater(images: ContentImage[], index: number) {
    if (images.length === 0 || index < 0 || index >= images.length) return;
    setActiveImages(images);
    setOpenIndex(index);
  }

  function openAtUrl(url: string | null | undefined) {
    if (!url) return;
    const live = imagesFromDom(coverImageUrl, contentRef.current);
    const list = live.length > 0 ? live : parsedImages;
    const index = list.findIndex((image) => urlsMatch(image.url, url));
    openTheater(list, index >= 0 ? index : 0);
  }

  function onContentClick(event: MouseEvent<HTMLDivElement>) {
    const target = event.target as HTMLElement | null;
    const img = target?.closest("img");
    if (!img || !(img instanceof HTMLImageElement)) return;

    // Stop link wrappers from navigating away.
    event.preventDefault();
    event.stopPropagation();

    const live = imagesFromDom(coverImageUrl, contentRef.current);
    const list = live.length > 0 ? live : parsedImages;
    const clickedUrl =
      img.getAttribute("src") || img.currentSrc || img.src || "";

    let index = list.findIndex((image) => urlsMatch(image.url, clickedUrl));
    if (index < 0) {
      const domImgs = Array.from(
        contentRef.current?.querySelectorAll("img") ?? [],
      );
      const domIndex = domImgs.indexOf(img);
      const coverOffset = coverImageUrl?.trim() ? 1 : 0;
      index = domIndex >= 0 ? coverOffset + domIndex : 0;
    }

    openTheater(list, Math.min(index, list.length - 1));
  }

  return (
    <>
      {coverImageUrl ? (
        <button
          type="button"
          onClick={() => openAtUrl(coverImageUrl)}
          className="mt-8 block w-full cursor-zoom-in overflow-hidden p-0 text-left"
          aria-label={title ? `View images: ${title}` : "View images"}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverImageUrl}
            alt=""
            className="aspect-[16/9] w-full object-cover transition hover:brightness-95"
            style={{
              objectPosition: coverFocusObjectPosition(
                normalizeCoverFocus(coverImageFocus),
              ),
            }}
          />
        </button>
      ) : null}

      <div
        ref={contentRef}
        className={className}
        onClickCapture={onContentClick}
        dangerouslySetInnerHTML={{ __html: safe }}
      />

      {openIndex !== null ? (
        <ImageLightbox
          images={activeImages}
          index={openIndex}
          title={title}
          onClose={() => setOpenIndex(null)}
          onIndexChange={setOpenIndex}
        />
      ) : null}
    </>
  );
}
