"use client";

import { useEffect, useId, useMemo, useState } from "react";
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
  /** Single-select callback (default mode). */
  onSelect?: (media: MediaPickerSelection) => void;
  /** Multi-select confirm callback. */
  onSelectMany?: (media: MediaPickerSelection[]) => void;
  selectionMode?: "single" | "multiple";
  /** Restrict listed media kinds. Defaults to images only. */
  kind?: "image" | "video" | "all";
  title?: string;
  /** Kept for API compatibility; selection starts empty each open. */
  selectedIds?: string[];
};

type ListResponse = {
  items: AdminMediaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  error?: string;
};

function toSelection(item: AdminMediaItem): MediaPickerSelection {
  return {
    id: item.id,
    url: item.url,
    alt: item.alt || item.originalName,
    originalName: item.originalName,
    kind: item.kind,
    contentType: item.contentType,
  };
}

type SessionProps = Omit<Props, "open" | "selectedIds"> & {
  kind: "image" | "video" | "all";
  selectionMode: "single" | "multiple";
  title: string;
};

function MediaPickerSession({
  onClose,
  onSelect,
  onSelectMany,
  selectionMode,
  kind,
  title,
}: SessionProps) {
  const titleId = useId();
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [pageState, setPageState] = useState({ filterKey: "", page: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ListResponse | null>(null);
  const [picked, setPicked] = useState<Record<string, MediaPickerSelection>>({});

  const isMultiple = selectionMode === "multiple";
  const filterKey = `${kind}|${debouncedQuery}`;
  const page = pageState.filterKey === filterKey ? pageState.page : 1;

  useEffect(() => {
    const id = window.setTimeout(() => setDebouncedQuery(query.trim()), 250);
    return () => window.clearTimeout(id);
  }, [query]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      // Yield so setState is not synchronous inside the effect body.
      await Promise.resolve();
      if (controller.signal.aborted) return;

      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        params.set("page", String(page));
        if (kind !== "all") params.set("kind", kind);
        if (debouncedQuery) params.set("q", debouncedQuery);
        const response = await fetch(`/api/media/library?${params.toString()}`, {
          signal: controller.signal,
        });
        const payload = (await response.json().catch(() => null)) as ListResponse | null;
        if (controller.signal.aborted) return;
        if (!response.ok || !payload) {
          throw new Error(payload?.error || "Failed to load media");
        }
        setData(payload);
        if (isMultiple) {
          setPicked((prev) => {
            const next = { ...prev };
            for (const item of payload.items) {
              if (next[item.id]) {
                next[item.id] = toSelection(item);
              }
            }
            return next;
          });
        }
      } catch (loadError) {
        if (controller.signal.aborted) return;
        setData(null);
        setError(
          loadError instanceof Error ? loadError.message : "Failed to load media",
        );
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void load();
    return () => controller.abort();
  }, [debouncedQuery, isMultiple, kind, page]);

  useEffect(() => {
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
  }, [onClose]);

  const pickedCount = useMemo(() => Object.keys(picked).length, [picked]);
  const items = data?.items ?? [];

  function setPage(nextPage: number) {
    setPageState({ filterKey, page: nextPage });
  }

  function toggleItem(item: AdminMediaItem) {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
      } else {
        next[item.id] = toSelection(item);
      }
      return next;
    });
  }

  function confirmMultiple() {
    const selected = Object.values(picked).filter((item) => item.url);
    onSelectMany?.(selected);
    onClose();
  }

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
            {isMultiple && pickedCount > 0 ? (
              <span className="ml-2 font-normal text-gray-500">
                ({pickedCount} selected)
              </span>
            ) : null}
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
              {items.map((item) => {
                const selected = Boolean(picked[item.id]);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      if (isMultiple) {
                        toggleItem(item);
                        return;
                      }
                      onSelect?.(toSelection(item));
                      onClose();
                    }}
                    className={`group overflow-hidden rounded-lg border bg-white text-left transition ${
                      selected
                        ? "border-gray-900 ring-2 ring-gray-900/20"
                        : "border-gray-200 hover:border-gray-900"
                    }`}
                  >
                    <div className="relative aspect-square bg-gray-100">
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
                      {isMultiple ? (
                        <span
                          className={`absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded border text-[10px] font-semibold ${
                            selected
                              ? "border-gray-900 bg-gray-900 text-white"
                              : "border-white/80 bg-white/90 text-transparent"
                          }`}
                        >
                          ✓
                        </span>
                      ) : null}
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
                );
              })}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
          {data && data.totalPages > 1 ? (
            <>
              <p className="text-xs text-gray-500">
                Page {data.page} of {data.totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage(Math.max(1, page - 1))}
                  className="rounded border border-gray-300 px-2.5 py-1 text-xs disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  type="button"
                  disabled={page >= data.totalPages || loading}
                  onClick={() => setPage(Math.min(data.totalPages, page + 1))}
                  className="rounded border border-gray-300 px-2.5 py-1 text-xs disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </>
          ) : (
            <span className="text-xs text-gray-500">
              {data ? `${data.total} item${data.total === 1 ? "" : "s"}` : null}
            </span>
          )}

          {isMultiple ? (
            <button
              type="button"
              disabled={pickedCount === 0}
              onClick={confirmMultiple}
              className="ml-auto rounded bg-gray-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-black disabled:opacity-40"
            >
              Add selected ({pickedCount})
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function MediaPickerModal({
  open,
  onClose,
  onSelect,
  onSelectMany,
  selectionMode = "single",
  kind = "image",
  title = "Choose from Media library",
}: Props) {
  if (!open) return null;

  return (
    <MediaPickerSession
      onClose={onClose}
      onSelect={onSelect}
      onSelectMany={onSelectMany}
      selectionMode={selectionMode}
      kind={kind}
      title={title}
    />
  );
}
