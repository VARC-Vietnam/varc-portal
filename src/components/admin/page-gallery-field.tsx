"use client";

import { useState, useTransition } from "react";
import type { PageGalleryItemValues } from "@/lib/validations/article";
import {
  MediaPickerModal,
  type MediaPickerSelection,
} from "@/components/admin/media-picker-modal";
import { notifyError, notifySuccess } from "@/components/admin/admin-toast";

type Props = {
  items: PageGalleryItemValues[];
  onChange: (items: PageGalleryItemValues[]) => void;
};

function toGalleryItem(media: MediaPickerSelection): PageGalleryItemValues {
  return {
    mediaId: media.id,
    url: media.url,
    alt: media.alt || media.originalName,
    originalName: media.originalName,
  };
}

export function PageGalleryField({ items, onChange }: Props) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function mergeItems(incoming: MediaPickerSelection[]) {
    const byId = new Map(items.map((item) => [item.mediaId, item]));
    for (const media of incoming) {
      if (!media.url) continue;
      byId.set(media.id, toGalleryItem(media));
    }
    onChange(Array.from(byId.values()));
  }

  function removeItem(mediaId: string) {
    onChange(items.filter((item) => item.mediaId !== mediaId));
  }

  function moveItem(mediaId: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.mediaId === mediaId);
    if (index < 0) return;
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= items.length) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.splice(nextIndex, 0, moved);
    onChange(next);
  }

  function selectAllMedia() {
    startTransition(async () => {
      try {
        const response = await fetch("/api/media/library?kind=image&all=1");
        const payload = (await response.json().catch(() => null)) as {
          items?: Array<{
            id: string;
            url: string;
            alt: string;
            originalName: string;
            kind: string;
            contentType: string;
          }>;
          error?: string;
        } | null;
        if (!response.ok || !payload?.items) {
          throw new Error(payload?.error || "Failed to load media");
        }
        const next = payload.items
          .filter((item) => item.kind === "image")
          .map((item) =>
            toGalleryItem({
              id: item.id,
              url: item.url,
              alt: item.alt || item.originalName,
              originalName: item.originalName,
              kind: "image",
              contentType: item.contentType,
            }),
          );
        onChange(next);
        notifySuccess(
          next.length
            ? `Added ${next.length} image${next.length === 1 ? "" : "s"}`
            : "No images in media library",
        );
      } catch (error) {
        notifyError(
          error instanceof Error ? error.message : "Failed to select all media",
        );
      }
    });
  }

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50/60 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Gallery images</p>
          <p className="mt-0.5 text-xs text-gray-500">
            Pick images from the Media library. Order here is the public gallery
            order.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50"
          >
            Add from library
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={selectAllMedia}
            className="rounded border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-50"
          >
            {pending ? "Loading…" : "Select all media"}
          </button>
          {items.length > 0 ? (
            <button
              type="button"
              onClick={() => onChange([])}
              className="rounded border border-red-200 px-3 py-1.5 text-xs text-red-700 hover:bg-red-50"
            >
              Clear
            </button>
          ) : null}
        </div>
      </div>

      {items.length === 0 ? (
        <p className="rounded border border-dashed border-gray-300 bg-white px-3 py-6 text-center text-sm text-gray-500">
          No gallery images yet.
        </p>
      ) : (
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <li
              key={item.mediaId}
              className="flex gap-3 overflow-hidden rounded-lg border border-gray-200 bg-white p-2"
            >
              <div className="h-16 w-16 shrink-0 overflow-hidden rounded bg-gray-100">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.url}
                  alt={item.alt || item.originalName}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-xs font-medium text-gray-900"
                  title={item.originalName}
                >
                  {item.originalName || "Image"}
                </p>
                <p
                  className="truncate text-[11px] text-gray-500"
                  title={item.alt}
                >
                  {item.alt ? `Alt: ${item.alt}` : "No alt text"}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <button
                    type="button"
                    disabled={index === 0}
                    onClick={() => moveItem(item.mediaId, -1)}
                    className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] disabled:opacity-40"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={index === items.length - 1}
                    onClick={() => moveItem(item.mediaId, 1)}
                    className="rounded border border-gray-200 px-1.5 py-0.5 text-[11px] disabled:opacity-40"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => removeItem(item.mediaId)}
                    className="rounded border border-red-200 px-1.5 py-0.5 text-[11px] text-red-700"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        selectionMode="multiple"
        kind="image"
        title="Add images to gallery"
        onSelectMany={mergeItems}
      />
    </div>
  );
}
