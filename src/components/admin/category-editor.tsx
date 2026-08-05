"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions";
import { makeSlug } from "@/lib/slug";
import type { CategoryFormValues } from "@/lib/validations/article";

type Props = {
  categoryId?: string;
  initial: CategoryFormValues;
  isSystem?: boolean;
};

const emptyLocale = { name: "", description: "" };

export function CategoryEditor({
  categoryId,
  initial,
  isSystem = false,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState<"vi" | "en">("vi");

  const previewSlug = useMemo(
    () => (form.locales[tab].name ? makeSlug(form.locales[tab].name) : ""),
    [form.locales, tab],
  );

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveCategoryAction(categoryId ?? null, form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/categories/${result.id}`);
      router.refresh();
    });
  }

  function onDelete() {
    if (!categoryId || isSystem) return;
    if (
      !confirm(
        "Move this category to trash? Articles in it will be assigned to Uncategorized.",
      )
    ) {
      return;
    }
    startTransition(async () => {
      const result = await deleteCategoryAction(categoryId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/categories");
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
          <span className="mb-1 block font-medium">Name ({tab.toUpperCase()})</span>
          <input
            value={locale.name}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                locales: {
                  ...prev.locales,
                  [tab]: { ...prev.locales[tab], name: e.target.value },
                },
              }))
            }
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
          <span className="mb-1 block font-medium">Description</span>
          <textarea
            value={locale.description}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                locales: {
                  ...prev.locales,
                  [tab]: { ...prev.locales[tab], description: e.target.value },
                },
              }))
            }
            rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          disabled={pending}
          onClick={onSave}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          Save
        </button>
        {categoryId && !isSystem ? (
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Move to trash
          </button>
        ) : null}
        {isSystem ? (
          <p className="self-center text-xs text-gray-500">
            Built-in category — cannot be deleted.
          </p>
        ) : null}
      </div>
    </div>
  );
}

export const emptyCategoryForm: CategoryFormValues = {
  locales: {
    vi: { ...emptyLocale },
    en: { ...emptyLocale },
  },
};
