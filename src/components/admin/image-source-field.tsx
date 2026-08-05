"use client";

import { useId, useMemo, useRef, useState, useTransition } from "react";
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";
import { notifyError, notifySuccess } from "@/components/admin/admin-toast";
import {
  MediaPickerModal,
  type MediaPickerSelection,
} from "@/components/admin/media-picker-modal";

type SourceMode = "url" | "upload" | "library";

type Props = {
  label: string;
  description?: string;
  value: string;
  onChange: (value: string) => void;
  /** Optional preview alt when an image is selected (e.g. from library). */
  alt?: string;
  onAltChange?: (alt: string) => void;
  /** Stack controls for narrow side panels */
  compact?: boolean;
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
  alt = "",
  onAltChange,
  compact = false,
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
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewAlt, setPreviewAlt] = useState(alt);

  const preview = value.trim();
  const uploaded = isUploadedValue(preview);

  const modeHint = useMemo(() => {
    if (mode === "url") {
      return "Paste a public image URL (https://…).";
    }
    if (mode === "library") {
      return "Pick an existing image from the Media library.";
    }
    return `Upload JPG, PNG, GIF, or WebP up to ${formatBytes(MAX_FILE_SIZE)}.`;
  }, [mode]);

  function switchMode(next: SourceMode) {
    setError(null);
    setMode(next);
    if (next === "url" && !uploaded) {
      setUrlDraft(value);
    }
    if (next === "library") {
      setPickerOpen(true);
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
    setPreviewAlt("");
    onAltChange?.("");
  }

  function clearImage() {
    setError(null);
    setUrlDraft("");
    onChange("");
    setPreviewAlt("");
    onAltChange?.("");
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
        const nameAlt = file.name.replace(/\.[^/.]+$/, "") || "";
        setPreviewAlt(nameAlt);
        onAltChange?.(nameAlt);
        notifySuccess("Image uploaded");
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        setError(message);
        notifyError(message);
      }
    });
  }

  function selectFromLibrary(media: MediaPickerSelection) {
    onChange(media.url);
    setMode("library");
    setPreviewAlt(media.alt);
    onAltChange?.(media.alt);
    setError(null);
    notifySuccess("Image selected from library");
  }

  const modeToggle = (
    <div
      className={`inline-flex rounded-md border border-gray-300 bg-white p-0.5 text-xs ${
        compact ? "w-full" : ""
      }`}
    >
      <button
        type="button"
        onClick={() => switchMode("url")}
        className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
          compact ? "flex-1" : ""
        } ${
          mode === "url"
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        {compact ? "URL" : "Remote URL"}
      </button>
      <button
        type="button"
        onClick={() => switchMode("upload")}
        className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
          compact ? "flex-1" : ""
        } ${
          mode === "upload"
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        {compact ? "Upload" : "Upload file"}
      </button>
      <button
        type="button"
        onClick={() => switchMode("library")}
        className={`rounded px-2.5 py-1.5 font-medium transition-colors ${
          compact ? "flex-1" : ""
        } ${
          mode === "library"
            ? "bg-gray-900 text-white"
            : "text-gray-600 hover:text-gray-900"
        }`}
      >
        Library
      </button>
    </div>
  );

  const previewBox = (
    <div
      className={`flex items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white ${
        compact ? "aspect-video w-full" : "aspect-video sm:aspect-square"
      }`}
    >
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt={previewAlt || ""}
          className="h-full w-full object-cover"
        />
      ) : (
        <span className="px-3 text-center text-xs text-gray-400">
          No image selected
        </span>
      )}
    </div>
  );

  const controls = (
    <div className="min-w-0 space-y-3">
      <p className="text-xs text-gray-500">{modeHint}</p>

      {mode === "url" ? (
        <div className={`flex gap-2 ${compact ? "flex-col" : "flex-col sm:flex-row"}`}>
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
            className="min-w-0 w-full rounded border border-gray-300 bg-white px-3 py-2 text-sm"
          />
          <button
            type="button"
            onClick={applyUrl}
            className={`shrink-0 rounded bg-gray-900 px-3 py-2 text-sm font-medium text-white hover:bg-black ${
              compact ? "w-full" : ""
            }`}
          >
            Apply
          </button>
        </div>
      ) : mode === "library" ? (
        <div
          className={`rounded-lg border border-dashed border-gray-300 bg-white text-center ${
            compact ? "px-3 py-4" : "px-4 py-6"
          }`}
        >
          <p className="text-sm text-gray-700">
            {preview ? "Image selected from library" : "Choose an image from Media"}
          </p>
          {previewAlt ? (
            <p className="mt-1 truncate px-2 text-xs text-gray-500" title={previewAlt}>
              Alt: {previewAlt}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => setPickerOpen(true)}
            className={`mt-2 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 ${
              compact ? "w-full" : ""
            }`}
          >
            {preview ? "Change image" : "Browse library"}
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
          className={`rounded-lg border border-dashed bg-white text-center transition-colors ${
            compact ? "px-3 py-4" : "px-4 py-6"
          } ${
            dragOver
              ? "border-gray-900 bg-gray-100"
              : "border-gray-300 hover:border-gray-400"
          }`}
        >
          <p className="text-sm text-gray-700">
            {pending ? "Uploading…" : compact ? "Drop image here" : "Drag & drop an image here"}
          </p>
          {!compact ? <p className="mt-1 text-xs text-gray-500">or</p> : null}
          <button
            type="button"
            disabled={pending}
            onClick={() => fileInputRef.current?.click()}
            className={`mt-2 rounded border border-gray-300 px-3 py-1.5 text-sm text-gray-800 hover:bg-gray-50 disabled:opacity-50 ${
              compact ? "w-full" : ""
            }`}
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

      {error ? <p className="text-sm text-red-600 break-words">{error}</p> : null}

      {preview ? (
        <div
          className={`flex gap-2 text-xs text-gray-500 ${
            compact ? "flex-col items-stretch" : "flex-wrap items-center"
          }`}
        >
          <span className="w-fit rounded bg-white px-2 py-1 ring-1 ring-gray-200">
            {mode === "library"
              ? "Media library"
              : uploaded
                ? "Uploaded file"
                : "Remote URL"}
          </span>
          {!preview.startsWith("data:") ? (
            <span
              className="min-w-0 break-all font-mono leading-snug"
              title={preview}
            >
              {preview}
            </span>
          ) : null}
          <button
            type="button"
            onClick={clearImage}
            className={`text-red-700 hover:underline ${
              compact ? "w-full rounded border border-red-200 px-3 py-1.5 text-left" : "ml-auto"
            }`}
          >
            Remove
          </button>
        </div>
      ) : null}
    </div>
  );

  return (
    <div
      className={`min-w-0 overflow-hidden rounded-lg border border-gray-200 bg-gray-50/60 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div
        className={`mb-3 flex gap-3 ${
          compact
            ? "flex-col items-stretch"
            : "flex-wrap items-start justify-between"
        }`}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900">{label}</p>
          {description ? (
            <p className="mt-0.5 text-xs text-gray-500">{description}</p>
          ) : null}
        </div>
        {modeToggle}
      </div>

      {compact ? (
        <div className="space-y-3">
          {previewBox}
          {controls}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_11rem]">
          {controls}
          {previewBox}
        </div>
      )}

      <MediaPickerModal
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={selectFromLibrary}
        kind="image"
        title={`Choose ${label.toLowerCase()}`}
      />
    </div>
  );
}
