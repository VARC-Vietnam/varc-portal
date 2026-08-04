"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deletePageAction, savePageAction } from "@/lib/actions";
import { makeSlug } from "@/lib/slug";
import type { PageFormValues } from "@/lib/validations/article";

type Props = {
  pageId?: string;
  initial: PageFormValues;
};

const emptyLocale = {
  title: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
};

export function PageEditor({ pageId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState<"vi" | "en">("vi");

  const previewSlug = useMemo(
    () => (form.locales[tab].title ? makeSlug(form.locales[tab].title) : ""),
    [form.locales, tab],
  );

  const canPublish = Boolean(
    form.locales.vi.title.trim() && form.locales.vi.content.trim(),
  );

  function updateLocale(
    locale: "vi" | "en",
    field: keyof typeof emptyLocale,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      locales: {
        ...prev.locales,
        [locale]: { ...prev.locales[locale], [field]: value },
      },
    }));
  }

  function onSave(status: "draft" | "published") {
    setError(null);
    startTransition(async () => {
      const result = await savePageAction(pageId ?? null, { ...form, status });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/pages/${result.id}`);
      router.refresh();
    });
  }

  function onDelete() {
    if (!pageId) return;
    if (!confirm("Delete this page?")) return;
    startTransition(async () => {
      const result = await deletePageAction(pageId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/pages");
      router.refresh();
    });
  }

  const locale = form.locales[tab];

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("vi")}
          className={`rounded px-3 py-1.5 text-sm ${tab === "vi" ? "bg-gray-900 text-white" : "border border-gray-300"}`}
        >
          Vietnamese
        </button>
        <button
          type="button"
          onClick={() => setTab("en")}
          className={`rounded px-3 py-1.5 text-sm ${tab === "en" ? "bg-gray-900 text-white" : "border border-gray-300"}`}
        >
          English
        </button>
      </div>

      <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Title ({tab.toUpperCase()})</span>
          <input
            value={locale.title}
            onChange={(e) => updateLocale(tab, "title", e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-medium">Slug (auto)</span>
          <p className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 font-mono text-gray-600">
            {previewSlug || "—"}
          </p>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Content (Markdown)</span>
          <textarea
            value={locale.content}
            onChange={(e) => updateLocale(tab, "content", e.target.value)}
            rows={14}
            className="w-full rounded border border-gray-300 px-3 py-2 font-mono text-sm"
          />
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Meta title</span>
            <input
              value={locale.metaTitle}
              onChange={(e) => updateLocale(tab, "metaTitle", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Meta description</span>
            <input
              value={locale.metaDescription}
              onChange={(e) =>
                updateLocale(tab, "metaDescription", e.target.value)
              }
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 md:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.showInNav}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, showInNav: e.target.checked }))
            }
          />
          View in site navigation
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Sort order</span>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                sortOrder: Number(e.target.value) || 0,
              }))
            }
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={() => onSave("draft")}
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={pending || !canPublish}
          onClick={() => onSave("published")}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          Publish
        </button>
        {pageId ? (
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="ml-auto rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Delete
          </button>
        ) : null}
      </div>
    </div>
  );
}

export const emptyPageForm: PageFormValues = {
  status: "draft",
  showInNav: false,
  sortOrder: 0,
  locales: {
    vi: { ...emptyLocale },
    en: { ...emptyLocale },
  },
};
