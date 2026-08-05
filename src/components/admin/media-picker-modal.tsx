"use client";

import { useCallback, useEffect, useId, useState } from "react";
import { formatBytes, type AdminMediaItem } from "@/lib/media/types";

export type MediaPickerSelection = {
  id: string;
  url: string;
  alt: string;
  originalName: string;
  kind: AdminMediaItem["kind"];
  contentType: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (media: MediaPickerSelection) => void;
  /** Restrict listed media kinds. Defaults to images only. */
  kind?: "image" | "video" | "all";
  title?: string;
};

type ListResponse = {
  items: AdminMediaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
};

export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  kind = "image",
  title = "Choose from Media library",
}: Props) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    setPage(1);
  }, [open, debouncedQuery, kind]);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      if (kind !== "all") params.set("kind", kind);
      if (debouncedQuery) params.set("q", debouncedQuery);
      const response = await fetch(`/api/media/library?${params.toString()}`);
      const payload = (await response.json().catch(() => null)) as ListResponse | null;
      if (!response.ok || !payload) {
        throw new Error(payload?.error || "Failed to load media");
      }
      setData(payload);
    } catch (loadError) {
      setData(null);
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load media",
      );
    } finally {
      setLoading(false);
    }
  }, [debouncedQuery, kind, open, page]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  const items = data?.items ?? [];

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
    >
      <button
        type="button"
        aria-label="Close media picker"
        className="absolute inset-0 cursor-default"
        onClick={onClose}
      />
      <div className="relative z-10 flex max-h-[90dvh] w-full max-w-3xl flex-col rounded-t-xl border border-gray-200 bg-white shadow-xl sm:rounded-xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-200 px-4 py-3">
          <h2 id={titleId} className="text-sm font-semibold text-gray-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        <div className="border-b border-gray-100 px-4 py-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name or alt text…"
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="text-sm text-gray-500">Loading media…</p>
          ) : error ? (
            <p className="text-sm text-red-700">{error}</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-gray-600">
              No media found. Upload files under Media first.
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onSelect({
                      id: item.id,
                      url: item.url,
                      alt: item.alt || item.originalName,
                      originalName: item.originalName,
                      kind: item.kind,
                      contentType: item.contentType,
                    });
                    onClose();
                  }}
                  className="group overflow-hidden rounded-lg border border-gray-200 bg-white text-left transition hover:border-gray-900"
                >
                  <div className="aspect-square bg-gray-100">
                    {item.kind === "image" ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.url}
                        alt={item.alt || item.originalName}
                        className="h-full w-full object-cover"
                      />
                    ) : item.kind === "video" ? (
                      <video
                        src={item.url}
                        className="h-full w-full object-cover"
                        muted
                        playsInline
                        preload="metadata"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center text-xs text-gray-500">
                        File
                      </div>
                    )}
                  </div>
                  <div className="space-y-0.5 p-2">
                    <p
                      className="truncate text-xs font-medium text-gray-900"
                      title={item.originalName}
                    >
                      {item.originalName}
                    </p>
                    <p className="truncate text-[11px] text-gray-500">
                      {item.alt
                        ? `Alt: ${item.alt}`
                        : formatBytes(item.size)}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {data && data.totalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">
              Page {data.page} of {data.totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1 || loading}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
                className="rounded border border-gray-300 px-2.5 py-1 text-xs disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={page >= data.totalPages || loading}
                onClick={() =>
                  setPage((current) => Math.min(data.totalPages, current + 1))
                }
                className="rounded border border-gray-300 px-2.5 py-1 text-xs disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
