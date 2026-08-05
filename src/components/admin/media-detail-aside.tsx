"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateMediaAltAction } from "@/lib/actions";
import { formatBytes, type AdminMediaItem } from "@/lib/media/types";
import { notifyAction } from "@/components/admin/admin-toast";

type Props = {
  item: AdminMediaItem | null;
  trash?: boolean;
  onClose: () => void;
  onUpdated?: (item: AdminMediaItem) => void;
};

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

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-medium tracking-wide text-gray-500 uppercase">
        {label}
      </dt>
      <dd className="mt-1 break-all text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function MediaAltEditor({
  item,
  trash,
  onUpdated,
}: {
  item: AdminMediaItem;
  trash: boolean;
  onUpdated?: (item: AdminMediaItem) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [alt, setAlt] = useState(item.alt ?? "");
  const [error, setError] = useState<string | null>(null);

  function onSaveAlt() {
    if (trash) return;
    setError(null);
    startTransition(async () => {
      const result = await updateMediaAltAction(item.id, alt);
      if (!notifyAction(result, "Alt text saved")) {
        setError(result.error);
        return;
      }
      onUpdated?.({ ...item, alt: result.alt });
      router.refresh();
    });
  }

  return (
    <div className="mt-auto border-t border-gray-200 p-4">
      <label className="block text-sm">
        <span className="mb-1 block font-medium text-gray-900">Alt text</span>
        <span className="mb-2 block text-xs text-gray-500">
          Describe the image for accessibility and SEO.
        </span>
        <textarea
          value={alt}
          onChange={(event) => setAlt(event.target.value)}
          rows={3}
          maxLength={500}
          disabled={trash || pending}
          placeholder="e.g. Conference hall during opening ceremony"
          className="w-full resize-y rounded border border-gray-300 px-3 py-2 text-sm disabled:bg-gray-50 disabled:text-gray-500"
        />
      </label>
      {error ? <p className="mt-2 text-sm text-red-700">{error}</p> : null}
      {!trash ? (
        <button
          type="button"
          disabled={pending || alt.trim() === (item.alt ?? "").trim()}
          onClick={onSaveAlt}
          className="mt-3 w-full rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save alt text"}
        </button>
      ) : (
        <p className="mt-3 text-xs text-gray-500">
          Restore this file to edit alt text.
        </p>
      )}
    </div>
  );
}

export function MediaFullscreen({
  item,
  onClose,
}: {
  item: AdminMediaItem;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Full screen preview of ${item.originalName}`}
      className="fixed inset-0 z-[60] flex flex-col bg-black/90"
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 text-white">
        <p className="min-w-0 truncate text-sm font-medium">
          {item.originalName}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded border border-white/30 px-2.5 py-1 text-xs hover:bg-white/10"
        >
          Close
        </button>
      </div>
      <button
        type="button"
        className="flex min-h-0 flex-1 items-center justify-center p-4"
        onClick={onClose}
        aria-label="Close full screen preview"
      >
        {item.kind === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- fullscreen preview
          <img
            src={item.url}
            alt={item.alt || item.originalName}
            className="max-h-full max-w-full object-contain"
            onClick={(event) => event.stopPropagation()}
          />
        ) : item.kind === "video" ? (
          <video
            src={item.url}
            className="max-h-full max-w-full object-contain"
            controls
            autoPlay
            playsInline
            onClick={(event) => event.stopPropagation()}
          />
        ) : (
          <p className="text-sm text-white/80">{item.contentType || "File"}</p>
        )}
      </button>
    </div>
  );
}

export function MediaDetailAside({
  item,
  trash = false,
  onClose,
  onUpdated,
}: Props) {
  const open = Boolean(item);
  const [fullscreen, setFullscreen] = useState(false);
  const showFullscreen = open && fullscreen;

  useEffect(() => {
    if (!open || fullscreen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, fullscreen, onClose]);

  return (
    <>
      <button
        type="button"
        aria-label="Close media details"
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0"
        }`}
      />
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-xl transition-transform duration-200 ease-out ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <h2 className="text-sm font-semibold text-gray-900">Media details</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-2.5 py-1 text-xs hover:bg-gray-50"
          >
            Close
          </button>
        </div>

        {item ? (
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
            <div className="border-b border-gray-100 bg-gray-50 p-4">
              <div className="relative aspect-[4/3] overflow-hidden rounded-lg bg-gray-200">
                {item.kind === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element -- detail preview
                  <img
                    src={item.url}
                    alt={item.alt || item.originalName}
                    className="h-full w-full object-contain"
                  />
                ) : item.kind === "video" ? (
                  <video
                    src={item.url}
                    className="h-full w-full object-contain"
                    controls
                    playsInline
                    preload="metadata"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-gray-500">
                    {item.contentType || "File"}
                  </div>
                )}
                {item.kind === "image" || item.kind === "video" ? (
                  <button
                    type="button"
                    onClick={() => setFullscreen(true)}
                    aria-label="View full screen"
                    title="View full screen"
                    className="absolute top-2 right-2 inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 bg-white/95 text-gray-800 shadow-sm transition hover:bg-white"
                  >
                    <EyeIcon />
                  </button>
                ) : null}
              </div>
            </div>

            <dl className="grid gap-4 p-4">
              <DetailRow label="Name" value={item.originalName} />
              <DetailRow label="Type" value={item.kind} />
              <DetailRow label="MIME" value={item.contentType} />
              <DetailRow label="Size" value={formatBytes(item.size)} />
              <DetailRow label="Storage key" value={item.key} />
              <DetailRow label="URL" value={item.url} />
              <DetailRow
                label="Uploaded"
                value={
                  item.createdAt
                    ? new Date(item.createdAt).toLocaleString("vi-VN")
                    : "—"
                }
              />
            </dl>

            <MediaAltEditor
              key={`${item.id}:${item.alt}`}
              item={item}
              trash={trash}
              onUpdated={onUpdated}
            />
          </div>
        ) : null}
      </aside>

      {item && showFullscreen ? (
        <MediaFullscreen
          key={item.id}
          item={item}
          onClose={() => setFullscreen(false)}
        />
      ) : null}
    </>
  );
}
