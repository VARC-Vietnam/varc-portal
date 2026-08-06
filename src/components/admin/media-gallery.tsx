"use client";

import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  useTransition,
  type DragEvent,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteMediaAction,
  permanentlyDeleteMediaAction,
  restoreMediaAction,
} from "@/lib/actions";
import { formatBytes, type AdminMediaItem } from "@/lib/media/types";
import { DEFAULT_MEDIA_MAX_BYTES } from "@/lib/media/limits";
import { notifyAction } from "@/components/admin/admin-toast";
import { TrashRowActions } from "@/components/admin/trash-row-actions";
import { useConfirm } from "@/components/admin/use-confirm";
import { TrashIcon } from "@/components/admin/admin-action-icons";
import { IconActionButton } from "@/components/admin/icon-action-button";
import { MediaDetailAside, MediaFullscreen } from "@/components/admin/media-detail-aside";

type Props = {
  initialItems: AdminMediaItem[];
  trash?: boolean;
  maxBytes?: number;
  page?: number;
  pageSize?: number;
  total?: number;
  totalPages?: number;
};

type UploadJob = {
  id: string;
  name: string;
  status: "uploading" | "done" | "error";
  error?: string;
};

type ViewMode = "title" | "grid" | "icon" | "list";

function EyeIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

const VIEW_STORAGE_KEY = "varc-admin-media-view";
const VIEW_CHANGE_EVENT = "varc-admin-media-view-change";

function isViewMode(value: string | null): value is ViewMode {
  return value === "title" || value === "grid" || value === "icon" || value === "list";
}

function readStoredView(): ViewMode {
  try {
    const stored = window.localStorage.getItem(VIEW_STORAGE_KEY);
    if (isViewMode(stored)) return stored;
  } catch {
    // ignore storage errors
  }
  return "grid";
}

function subscribeView(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(VIEW_CHANGE_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(VIEW_CHANGE_EVENT, onStoreChange);
  };
}

function setStoredView(next: ViewMode) {
  try {
    window.localStorage.setItem(VIEW_STORAGE_KEY, next);
  } catch {
    // ignore storage errors
  }
  window.dispatchEvent(new Event(VIEW_CHANGE_EVENT));
}

const VIEW_OPTIONS: { id: ViewMode; label: string; icon: ReactNode }[] = [
  {
    id: "grid",
    label: "Grid",
    icon: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </>
    ),
  },
  {
    id: "icon",
    label: "Icon",
    icon: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
  },
  {
    id: "title",
    label: "Title",
    icon: (
      <>
        <path d="M4 6h16" />
        <path d="M4 12h10" />
        <path d="M4 18h14" />
      </>
    ),
  },
  {
    id: "list",
    label: "List",
    icon: (
      <>
        <path d="M8 6h12M8 12h12M8 18h12" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
  },
];

const ACCEPT =
  "image/jpeg,image/png,image/gif,image/webp,image/svg+xml,video/mp4,video/webm,video/quicktime";

function MediaThumb({
  item,
  className,
  controls = false,
}: {
  item: AdminMediaItem;
  className?: string;
  controls?: boolean;
}) {
  if (item.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- gallery preview of CMS uploads
      <img
        src={item.url}
        alt={item.alt || item.originalName}
        className={className}
      />
    );
  }
  if (item.kind === "video") {
    return (
      <video
        src={item.url}
        className={className}
        muted
        playsInline
        preload="metadata"
        controls={controls}
      />
    );
  }
  return (
    <div
      className={`flex items-center justify-center bg-gray-100 text-xs text-gray-500 ${className ?? ""}`}
    >
      File
    </div>
  );
}

function ItemActions({
  item,
  trash,
  pending,
  copiedId,
  onCopy,
  onSoftDelete,
  onView,
}: {
  item: AdminMediaItem;
  trash: boolean;
  pending: boolean;
  copiedId: string | null;
  onCopy: (item: AdminMediaItem) => void;
  onSoftDelete: (item: AdminMediaItem) => void;
  onView: (item: AdminMediaItem) => void;
}) {
  const canPreview = item.kind === "image" || item.kind === "video";

  if (trash) {
    return (
      <div
        className="flex w-full items-center justify-between gap-2"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <TrashRowActions
          restoreAction={restoreMediaAction.bind(null, item.id)}
          deleteAction={permanentlyDeleteMediaAction.bind(null, item.id)}
          itemLabel={item.originalName}
        />
        {canPreview ? (
          <IconActionButton
            label="View full screen"
            onClick={() => onView(item)}
          >
            <EyeIcon />
          </IconActionButton>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="flex w-full items-center justify-between gap-2"
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={() => onCopy(item)}
        className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
      >
        {copiedId === item.id ? "Copied" : "Copy URL"}
      </button>
      <div className="ml-auto flex items-center gap-1">
        {canPreview ? (
          <IconActionButton
            label="View full screen"
            onClick={() => onView(item)}
          >
            <EyeIcon />
          </IconActionButton>
        ) : null}
        <IconActionButton
          label="Move to trash"
          variant="danger"
          disabled={pending}
          onClick={() => onSoftDelete(item)}
        >
          <TrashIcon />
        </IconActionButton>
      </div>
    </div>
  );
}

export function MediaGallery({
  initialItems,
  trash = false,
  maxBytes = DEFAULT_MEDIA_MAX_BYTES,
  page = 1,
  pageSize = 24,
  total = 0,
  totalPages = 1,
}: Props) {
  const router = useRouter();
  const { ask, modal } = useConfirm();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const [dragging, setDragging] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fullscreenId, setFullscreenId] = useState<string | null>(null);
  const [altOverrides, setAltOverrides] = useState<Record<string, string>>({});
  const view = useSyncExternalStore(
    subscribeView,
    readStoredView,
    () => "grid" as const,
  );

  const maxMb = Math.floor(maxBytes / (1024 * 1024));
  const rangeStart = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, total);

  const selectedItem = useMemo(() => {
    const found = initialItems.find((entry) => entry.id === selectedId);
    if (!found) return null;
    if (Object.prototype.hasOwnProperty.call(altOverrides, found.id)) {
      return { ...found, alt: altOverrides[found.id] ?? "" };
    }
    return found;
  }, [altOverrides, initialItems, selectedId]);

  const fullscreenItem = useMemo(() => {
    return initialItems.find((entry) => entry.id === fullscreenId) ?? null;
  }, [fullscreenId, initialItems]);

  function openItem(item: AdminMediaItem) {
    setSelectedId(item.id);
  }

  function viewItem(item: AdminMediaItem) {
    if (item.kind !== "image" && item.kind !== "video") return;
    setFullscreenId(item.id);
  }

  function mediaHref(targetPage: number) {
    const params = new URLSearchParams();
    if (trash) params.set("tab", "trash");
    if (targetPage > 1) params.set("page", String(targetPage));
    const query = params.toString();
    return query ? `/admin/media?${query}` : "/admin/media";
  }

  function changeView(next: ViewMode) {
    setStoredView(next);
  }

  const uploadFiles = useCallback(
    async (files: FileList | File[]) => {
      const list = Array.from(files);
      if (list.length === 0) return;
      setError(null);

      for (const file of list) {
        const jobId = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
        setJobs((prev) => [
          { id: jobId, name: file.name, status: "uploading" },
          ...prev,
        ]);

        try {
          if (file.size <= 0 || file.size > maxBytes) {
            throw new Error(`File must be under ${maxMb}MB`);
          }
          const formData = new FormData();
          formData.append("file", file);
          const response = await fetch("/api/media", {
            method: "POST",
            body: formData,
          });
          const payload = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          if (!response.ok) {
            throw new Error(payload?.error || "Upload failed");
          }
          setJobs((prev) =>
            prev.map((job) =>
              job.id === jobId ? { ...job, status: "done" } : job,
            ),
          );
        } catch (uploadError) {
          const message =
            uploadError instanceof Error
              ? uploadError.message
              : "Upload failed";
          setJobs((prev) =>
            prev.map((job) =>
              job.id === jobId
                ? { ...job, status: "error", error: message }
                : job,
            ),
          );
        }
      }

      router.push("/admin/media");
      router.refresh();
    },
    [maxBytes, maxMb, router],
  );

  function onDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    if (trash || pending) return;
    void uploadFiles(event.dataTransfer.files);
  }

  async function onSoftDelete(item: AdminMediaItem) {
    const confirmed = await ask({
      title: "Move to trash",
      message: `Move “${item.originalName}” to trash?`,
      confirmLabel: "Move to trash",
      variant: "danger",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteMediaAction(item.id);
      if (!notifyAction(result, "Moved to trash")) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  async function copyUrl(item: AdminMediaItem) {
    try {
      await navigator.clipboard.writeText(item.url);
      setCopiedId(item.id);
      window.setTimeout(
        () => setCopiedId((id) => (id === item.id ? null : id)),
        1500,
      );
    } catch {
      setError("Could not copy URL");
    }
  }

  function renderItems() {
    if (view === "list") {
      return (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Preview</th>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Size</th>
                <th className="px-4 py-3 font-medium">Uploaded</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {initialItems.map((item) => (
                <tr
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openItem(item)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      openItem(item);
                    }
                  }}
                  className={`cursor-pointer border-b border-gray-100 hover:bg-gray-50 ${
                    selectedId === item.id ? "bg-lime-50" : ""
                  }`}
                >
                  <td className="px-4 py-2">
                    <div className="h-12 w-16 overflow-hidden rounded bg-gray-100">
                      <MediaThumb
                        item={item}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  </td>
                  <td className="max-w-[16rem] truncate px-4 py-2 font-medium" title={item.originalName}>
                    {item.originalName}
                  </td>
                  <td className="px-4 py-2 capitalize text-gray-600">{item.kind}</td>
                  <td className="px-4 py-2 text-gray-600">
                    {formatBytes(item.size)}
                  </td>
                  <td className="px-4 py-2 text-gray-600">
                    {item.createdAt
                      ? new Date(item.createdAt).toLocaleString("vi-VN")
                      : "—"}
                  </td>
                  <td className="px-4 py-2">
                    <div className="flex justify-end">
                      <ItemActions
                        item={item}
                        trash={trash}
                        pending={pending}
                        copiedId={copiedId}
                        onCopy={(entry) => void copyUrl(entry)}
                        onSoftDelete={(entry) => void onSoftDelete(entry)}
                        onView={viewItem}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (view === "icon") {
      return (
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
          {initialItems.map((item) => (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => openItem(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openItem(item);
                }
              }}
              className={`group cursor-pointer overflow-hidden rounded-lg border bg-white outline-none ${
                selectedId === item.id
                  ? "border-gray-900 ring-1 ring-gray-900"
                  : "border-gray-200 hover:border-gray-400"
              }`}
              title={item.originalName}
            >
              <div className="relative aspect-square bg-gray-100">
                <MediaThumb
                  item={item}
                  className="h-full w-full object-cover"
                />
                <div
                  className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-black/55 p-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                  onClick={(event) => event.stopPropagation()}
                >
                  {!trash ? (
                    <button
                      type="button"
                      onClick={() => void copyUrl(item)}
                      className="rounded bg-white/90 px-1.5 py-0.5 text-[10px] font-medium text-gray-900"
                    >
                      {copiedId === item.id ? "Copied" : "Copy"}
                    </button>
                  ) : (
                    <span />
                  )}
                  <div className="ml-auto flex items-center gap-0.5">
                    {item.kind === "image" || item.kind === "video" ? (
                      <IconActionButton
                        label="View full screen"
                        onClick={() => viewItem(item)}
                      >
                        <EyeIcon />
                      </IconActionButton>
                    ) : null}
                    {trash ? (
                      <div className="scale-90">
                        <TrashRowActions
                          restoreAction={restoreMediaAction.bind(null, item.id)}
                          deleteAction={permanentlyDeleteMediaAction.bind(
                            null,
                            item.id,
                          )}
                          itemLabel={item.originalName}
                        />
                      </div>
                    ) : (
                      <IconActionButton
                        label="Move to trash"
                        variant="danger"
                        disabled={pending}
                        onClick={() => void onSoftDelete(item)}
                      >
                        <TrashIcon />
                      </IconActionButton>
                    )}
                  </div>
                </div>
              </div>
              <p className="truncate px-1.5 py-1 text-center text-[11px] text-gray-700">
                {item.originalName}
              </p>
            </article>
          ))}
        </div>
      );
    }

    if (view === "title") {
      return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {initialItems.map((item) => (
            <article
              key={item.id}
              role="button"
              tabIndex={0}
              onClick={() => openItem(item)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  openItem(item);
                }
              }}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border bg-white p-3 outline-none ${
                selectedId === item.id
                  ? "border-gray-900 ring-1 ring-gray-900"
                  : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-md bg-gray-100">
                <MediaThumb
                  item={item}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="truncate text-sm font-semibold text-gray-900"
                  title={item.originalName}
                >
                  {item.originalName}
                </p>
                <p className="mt-0.5 text-xs text-gray-500">
                  <span className="capitalize">{item.kind}</span>
                  {" · "}
                  {formatBytes(item.size)}
                </p>
                <div className="mt-2">
                  <ItemActions
                    item={item}
                    trash={trash}
                    pending={pending}
                    copiedId={copiedId}
                    onCopy={(entry) => void copyUrl(entry)}
                    onSoftDelete={(entry) => void onSoftDelete(entry)}
                    onView={viewItem}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      );
    }

    // grid (default)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {initialItems.map((item) => (
          <article
            key={item.id}
            role="button"
            tabIndex={0}
            onClick={() => openItem(item)}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                openItem(item);
              }
            }}
            className={`cursor-pointer overflow-hidden rounded-lg border bg-white outline-none ${
              selectedId === item.id
                ? "border-gray-900 ring-1 ring-gray-900"
                : "border-gray-200 hover:border-gray-400"
            }`}
          >
            <div className="relative aspect-[4/3] bg-gray-100">
              <MediaThumb
                item={item}
                className="h-full w-full object-cover"
                controls={item.kind === "video"}
              />
              <span className="absolute top-2 left-2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                {item.kind}
              </span>
            </div>
            <div className="space-y-2 p-3">
              <p
                className="truncate text-sm font-medium text-gray-900"
                title={item.originalName}
              >
                {item.originalName}
              </p>
              <p className="text-xs text-gray-500">
                {formatBytes(item.size)}
                {item.createdAt
                  ? ` · ${new Date(item.createdAt).toLocaleString("vi-VN")}`
                  : null}
              </p>
              <ItemActions
                item={item}
                trash={trash}
                pending={pending}
                copiedId={copiedId}
                onCopy={(entry) => void copyUrl(entry)}
                onSoftDelete={(entry) => void onSoftDelete(entry)}
                onView={viewItem}
              />
            </div>
          </article>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {!trash ? (
          <div
            onDragEnter={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(event) => {
              event.preventDefault();
              setDragging(false);
            }}
            onDrop={onDrop}
            className={`rounded-lg border border-dashed px-4 py-8 text-center transition ${
              dragging
                ? "border-gray-900 bg-gray-50"
                : "border-gray-300 bg-white"
            }`}
          >
            <p className="text-sm font-medium text-gray-900">
              Drop images or videos here
            </p>
            <p className="mt-1 text-xs text-gray-500">
              JPEG, PNG, GIF, WebP, SVG, MP4, WebM, MOV — up to {maxMb}MB each.
              Multiple files supported.
            </p>
            <button
              type="button"
              disabled={pending}
              onClick={() => inputRef.current?.click()}
              className="mt-4 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              Choose files
            </button>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(event) => {
                if (event.target.files) void uploadFiles(event.target.files);
                event.target.value = "";
              }}
            />
          </div>
        ) : null}

        {jobs.length > 0 ? (
          <ul className="space-y-1 text-sm">
            {jobs.slice(0, 8).map((job) => (
              <li
                key={job.id}
                className={
                  job.status === "error"
                    ? "text-red-700"
                    : job.status === "done"
                      ? "text-green-700"
                      : "text-gray-600"
                }
              >
                {job.status === "uploading"
                  ? "Uploading"
                  : job.status === "done"
                    ? "Uploaded"
                    : "Failed"}
                : {job.name}
                {job.error ? ` — ${job.error}` : null}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            {total === 0
              ? "0 items"
              : `Showing ${rangeStart}–${rangeEnd} of ${total}`}
          </p>
          <div
            className="inline-flex rounded-md border border-gray-300 bg-white p-0.5"
            role="group"
            aria-label="Media view"
          >
            {VIEW_OPTIONS.map((option) => {
              const selected = view === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => changeView(option.id)}
                  aria-pressed={selected}
                  title={option.label}
                  className={`inline-flex items-center gap-1.5 rounded px-2.5 py-1.5 text-xs font-medium transition ${
                    selected
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3.5 w-3.5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden
                  >
                    {option.icon}
                  </svg>
                  <span className="hidden sm:inline">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {initialItems.length === 0 ? (
          <p className="text-gray-600">
            {trash ? "Trash is empty." : "No media uploaded yet."}
          </p>
        ) : (
          renderItems()
        )}

        {totalPages > 1 ? (
          <nav
            className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4"
            aria-label="Media pagination"
          >
            <p className="text-sm text-gray-600">
              Page {page} of {totalPages}
            </p>
            <div className="flex flex-wrap items-center gap-1">
              <Link
                href={mediaHref(page - 1)}
                aria-disabled={page <= 1}
                className={`rounded border border-gray-300 px-3 py-1.5 text-sm ${
                  page <= 1
                    ? "pointer-events-none opacity-40"
                    : "hover:bg-gray-50"
                }`}
              >
                Previous
              </Link>
              {Array.from({ length: totalPages }, (_, index) => index + 1)
                .filter((pageNumber) => {
                  if (totalPages <= 7) return true;
                  if (pageNumber === 1 || pageNumber === totalPages) return true;
                  return Math.abs(pageNumber - page) <= 1;
                })
                .reduce<number[]>((acc, pageNumber, index, list) => {
                  if (index > 0 && pageNumber - list[index - 1]! > 1) {
                    acc.push(-pageNumber);
                  }
                  acc.push(pageNumber);
                  return acc;
                }, [])
                .map((pageNumber) =>
                  pageNumber < 0 ? (
                    <span
                      key={`ellipsis-${pageNumber}`}
                      className="px-1 text-sm text-gray-400"
                    >
                      …
                    </span>
                  ) : (
                    <Link
                      key={pageNumber}
                      href={mediaHref(pageNumber)}
                      aria-current={pageNumber === page ? "page" : undefined}
                      className={`min-w-9 rounded border px-2.5 py-1.5 text-center text-sm ${
                        pageNumber === page
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-300 hover:bg-gray-50"
                      }`}
                    >
                      {pageNumber}
                    </Link>
                  ),
                )}
              <Link
                href={mediaHref(page + 1)}
                aria-disabled={page >= totalPages}
                className={`rounded border border-gray-300 px-3 py-1.5 text-sm ${
                  page >= totalPages
                    ? "pointer-events-none opacity-40"
                    : "hover:bg-gray-50"
                }`}
              >
                Next
              </Link>
            </div>
          </nav>
        ) : null}
      </div>
      <MediaDetailAside
        item={selectedItem}
        trash={trash}
        onClose={() => setSelectedId(null)}
        onUpdated={(updated) => {
          setAltOverrides((prev) => ({ ...prev, [updated.id]: updated.alt }));
        }}
      />
      {fullscreenItem ? (
        <MediaFullscreen
          item={fullscreenItem}
          onClose={() => setFullscreenId(null)}
        />
      ) : null}
      {modal}
    </>
  );
}
