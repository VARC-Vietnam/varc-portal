"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import { notifyError, notifySuccess } from "@/components/admin/admin-toast";

type SourceMode = "url" | "upload";

type Props = {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
};

function isUploadedValue(value: string): boolean {
  return (
    value.startsWith("data:") ||
    value.startsWith("/media/") ||
    /\/media\//.test(value)
  );
}

function detectMode(value: string): SourceMode {
  return isUploadedValue(value) ? "upload" : "url";
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ImageSourceField({
  label,
  description,
  value,
  onChange,
}: Props) {
  const inputId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<SourceMode>(() => detectMode(value));
  const [urlDraft, setUrlDraft] = useState(() =>
    isUploadedValue(value) ? "" : value,
  );
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const preview = value.trim();
  const uploaded = isUploadedValue(preview);

  const modeHint = useMemo(() => {
    if (mode === "url") {
      return "Paste a public image URL (https://…).";
    }
    return `Upload JPG, PNG, GIF, or WebP up to ${formatBytes(MAX_FILE_SIZE)}.`;
  }, [mode]);

  function switchMode(next: SourceMode) {
    setError(null);
    setMode(next);
    if (next === "url" && !uploaded) {
      setUrlDraft(value);
    }
  }

  function applyUrl() {
    setError(null);
    const next = urlDraft.trim();
    if (!next) {
      onChange("");
      return;
    }
    if (!/^https?:\/\//i.test(next) && !next.startsWith("/")) {
      setError("Use an http(s) URL or a site-relative path.");
      return;
    }
    onChange(next);
  }

  function clearImage() {
    setError(null);
    setUrlDraft("");
    onChange("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function readFile(file: File | undefined) {
    if (!file) return;
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file.");
      notifyError("Please choose an image file.");
      return;
    }

    startTransition(async () => {
      try {
        const url = await handleImageUpload(file);
        onChange(url);
        setMode("upload");
        notifySuccess("Image uploaded");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        notifyError(message);
      }
    });
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          ) : null}
        </div>
        <div className="inline-flex rounded-md border border-gray-300 bg-white p-0.5 text-xs">
          <button
            type="button"
            onClick={() => switchMode("url")}
            className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
              mode === "url"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Remote URL
          </button>
          <button
            type="button"
            onClick={() => switchMode("upload")}
            className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
              mode === "upload"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Upload file
          </button>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
        <div className="min-w-0 space-y-3">
          <p className="text-xs text-gray-500">{modeHint}</p>

          {mode === "url" ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id={`${inputId}-url`}
                value={urlDraft}
                onChange={(e) => setUrlDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    applyUrl();
                  }
                }}
                placeholder="https://example.com/image.jpg"
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={applyUrl}
                className="shrink-0 rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black"
              >
                Apply
              </button>
            </div>
          ) : (
            <div
              onDragEnter={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setDragOver(false);
              }}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                readFile(e.dataTransfer.files?.[0]);
              }}
              className={`rounded-lg border border-dashed bg-white px-4 py-6 text-center transition-colors ${
                dragOver
                  ? "border-gray-900 bg-gray-100"
                  : "border-gray-300 hover:border-gray-400"
              }`}
            >
              <p className="text-sm text-gray-700">
                {pending ? "Uploading…" : "Drag & drop an image here"}
              </p>
              <p className="mt-1 text-xs text-gray-500">or</p>
              <button
                type="button"
                disabled={pending}
                onClick={() => fileInputRef.current?.click()}
                className="mt-2 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50"
              >
                Choose file
              </button>
              <input
                ref={fileInputRef}
                id={`${inputId}-file`}
                type="file"
                accept="image/*"
                className="sr-only"
                onChange={(e) => {
                  readFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </div>
          )}

          {error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : null}

          {preview ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
              <span className="rounded bg-white px-2 py-1 ring-1 ring-gray-200">
                {uploaded ? "Uploaded file" : "Remote URL"}
              </span>
              {!preview.startsWith("data:") ? (
                <span className="truncate font-mono" title={preview}>
                  {preview}
                </span>
              ) : null}
              <button
                type="button"
                onClick={clearImage}
                className="ml-auto text-red-700 hover:underline"
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>

        <div className="flex aspect-video items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white sm:aspect-square">
          {preview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="px-3 text-center text-xs text-gray-400">
              No image selected
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
