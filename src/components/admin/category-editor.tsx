"use client";

import { useEffect, useId, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteCategoryAction, saveCategoryAction } from "@/lib/actions";
import { makeSlug } from "@/lib/slug";
import {
  MAX_CATEGORY_DEPTH,
  canPlaceUnderParent,
} from "@/lib/category-tree";
import type { CategoryFormValues } from "@/lib/validations/article";
import { emptyCategoryForm } from "@/lib/validations/article";
import { useConfirm } from "@/components/admin/use-confirm";
import { notifyAction } from "@/components/admin/admin-toast";

export type CategoryParentOption = {
  id: string;
  label: string;
  parentId: string | null;
  depth: number;
};

type Props = {
  open: boolean;
  categoryId?: string;
  initial: CategoryFormValues;
  isSystem?: boolean;
  parentOptions?: CategoryParentOption[];
  title?: string;
  onClose: () => void;
};

function normalizeCategoryForm(initial: CategoryFormValues): CategoryFormValues {
  return {
    parentId: initial.parentId ?? null,
    locales: {
      vi: {
        name: initial.locales?.vi?.name ?? "",
        description: initial.locales?.vi?.description ?? "",
      },
      en: {
        name: initial.locales?.en?.name ?? "",
        description: initial.locales?.en?.description ?? "",
      },
    },
  };
}

export function CategoryEditorModal({
  open,
  categoryId,
  initial,
  isSystem = false,
  parentOptions = [],
  title,
  onClose,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const { ask, modal } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(() => normalizeCategoryForm(initial));
  const [tab, setTab] = useState<"vi" | "en">("vi");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [open, pending, onClose]);

  const previewSlug = useMemo(
    () => (form.locales[tab].name ? makeSlug(form.locales[tab].name) : ""),
    [form.locales, tab],
  );

  const allowedParents = useMemo(() => {
    if (isSystem) return [];
    const refs = parentOptions.map((option) => ({
      id: option.id,
      parentId: option.parentId,
    }));
    const sourceId = categoryId ?? "__new__";
    if (!categoryId) {
      refs.push({ id: sourceId, parentId: null });
    }
    return parentOptions.filter((option) => {
      if (option.id === categoryId) return false;
      return canPlaceUnderParent(sourceId, option.id, refs);
    });
  }, [categoryId, isSystem, parentOptions]);

  if (!open) return null;

  const locale = form.locales[tab];
  const heading =
    title ??
    (categoryId
      ? isSystem
        ? "Edit built-in category"
        : "Edit category"
      : form.parentId
        ? "New child category"
        : "New category");

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveCategoryAction(categoryId ?? null, form);
      if (!notifyAction(result, "Category saved")) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  async function onDelete() {
    if (!categoryId || isSystem) return;
    const confirmed = await ask({
      title: "Move to trash",
      message:
        "Move this category to trash? Articles in it will be assigned to Uncategorized. Child categories move up one level.",
      confirmLabel: "Move to trash",
      variant: "danger",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(categoryId);
      if (!notifyAction(result, "Moved to trash")) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        role="presentation"
        onClick={pending ? undefined : onClose}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3">
            <h2
              id={titleId}
              className="text-xl font-semibold text-gray-900"
            >
              {heading}
            </h2>
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="cursor-pointer rounded border border-gray-200 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-50"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {error ? (
            <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="mt-5 space-y-4">
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

            {!isSystem ? (
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Parent category</span>
                <select
                  value={form.parentId ?? ""}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      parentId: event.target.value || null,
                    }))
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2"
                >
                  <option value="">Top level</option>
                  {allowedParents.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs text-gray-500">
                  Nest under another category (max {MAX_CATEGORY_DEPTH} levels).
                </span>
              </label>
            ) : (
              <p className="text-sm text-gray-500">
                Built-in category — always top level.
              </p>
            )}

            <label className="block text-sm">
              <span className="mb-1 block font-medium">
                Name ({tab.toUpperCase()})
              </span>
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
                autoFocus
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
                      [tab]: {
                        ...prev.locales[tab],
                        description: e.target.value,
                      },
                    },
                  }))
                }
                rows={3}
                className="w-full rounded border border-gray-300 px-3 py-2"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              {categoryId && !isSystem ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={onDelete}
                  className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Move to trash
                </button>
              ) : null}
              {isSystem ? (
                <p className="text-xs text-gray-500">
                  Built-in — cannot be deleted.
                </p>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={onClose}
                className="cursor-pointer rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={onSave}
                className="cursor-pointer rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
              >
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      </div>
      {modal}
    </>
  );
}

export { emptyCategoryForm };
