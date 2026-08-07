"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMenuItemAction, saveMenuItemAction } from "@/lib/actions";
import { MAX_MENU_DEPTH } from "@/lib/menu-tree";
import type { MenuItemFormValues } from "@/lib/validations/article";
import type { MenuLocation } from "@/models/MenuItem";
import { useConfirm } from "@/components/admin/use-confirm";
import { notifyAction } from "@/components/admin/admin-toast";

export type MenuParentOption = {
  id: string;
  label: string;
  depth: number;
};

type PageOption = {
  id: string;
  title: string;
  status: string;
};

type Props = {
  open: boolean;
  editingId?: string | null;
  location: MenuLocation;
  initial: MenuItemFormValues;
  pages: PageOption[];
  parentOptions: MenuParentOption[];
  onClose: () => void;
};

export function emptyMenuItemForm(location: MenuLocation): MenuItemFormValues {
  return {
    location,
    type: "page",
    pageId: null,
    parentId: null,
    locales: {
      vi: { label: "", url: "" },
      en: { label: "", url: "" },
    },
    enabled: true,
    openInNewTab: false,
  };
}

export function MenuItemEditorModal({
  open,
  editingId = null,
  location,
  initial,
  pages,
  parentOptions,
  onClose,
}: Props) {
  const router = useRouter();
  const titleId = useId();
  const { ask, modal } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initial);

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

  if (!open) return null;

  const heading = editingId
    ? "Edit menu item"
    : form.parentId
      ? "New child menu item"
      : "New menu item";

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveMenuItemAction(editingId, {
        ...form,
        location,
        parentId: form.parentId ?? null,
      });
      if (
        !notifyAction(
          result,
          editingId ? "Menu item updated" : "Menu item created",
        )
      ) {
        setError(result.error);
        return;
      }
      router.refresh();
      onClose();
    });
  }

  async function onDelete() {
    if (!editingId) return;
    const confirmed = await ask({
      title: "Move to trash",
      message:
        "Move this menu item to trash? Any child items become top-level.",
      confirmLabel: "Move to trash",
      variant: "danger",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteMenuItemAction(editingId);
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
            <h2 id={titleId} className="text-xl font-semibold text-gray-900">
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
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Parent (dropdown)</span>
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
                {parentOptions.map((item) => {
                  const prefix =
                    item.depth > 0 ? `${"— ".repeat(item.depth)}` : "";
                  return (
                    <option key={item.id} value={item.id}>
                      {prefix}
                      {item.label}
                    </option>
                  );
                })}
              </select>
              <span className="mt-1 block text-xs text-gray-500">
                Nested items appear in dropdowns on the site (max{" "}
                {MAX_MENU_DEPTH} levels).
              </span>
            </label>

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="menu-type"
                  checked={form.type === "page"}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      type: "page",
                      pageId: prev.pageId,
                    }))
                  }
                />
                CMS page
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="menu-type"
                  checked={form.type === "custom"}
                  onChange={() =>
                    setForm((prev) => ({
                      ...prev,
                      type: "custom",
                      pageId: null,
                    }))
                  }
                />
                Custom link
              </label>
            </div>

            {form.type === "page" ? (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm md:col-span-2">
                  <span className="mb-1 block font-medium">Page</span>
                  <select
                    value={form.pageId ?? ""}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        pageId: event.target.value || null,
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    autoFocus
                  >
                    <option value="">Select a page…</option>
                    {pages.map((page) => (
                      <option key={page.id} value={page.id}>
                        {page.title || "(untitled)"} ({page.status})
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">
                    Label override (VI, optional)
                  </span>
                  <input
                    value={form.locales.vi.label}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        locales: {
                          ...prev.locales,
                          vi: {
                            ...prev.locales.vi,
                            label: event.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Uses page title if empty"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">
                    Label override (EN, optional)
                  </span>
                  <input
                    value={form.locales.en.label}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        locales: {
                          ...prev.locales,
                          en: {
                            ...prev.locales.en,
                            label: event.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="Uses page title if empty"
                  />
                </label>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Label (VI)</span>
                  <input
                    value={form.locales.vi.label}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        locales: {
                          ...prev.locales,
                          vi: {
                            ...prev.locales.vi,
                            label: event.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    autoFocus
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">URL (VI)</span>
                  <input
                    value={form.locales.vi.url}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        locales: {
                          ...prev.locales,
                          vi: { ...prev.locales.vi, url: event.target.value },
                        },
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="/vi or https://…"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">Label (EN)</span>
                  <input
                    value={form.locales.en.label}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        locales: {
                          ...prev.locales,
                          en: {
                            ...prev.locales.en,
                            label: event.target.value,
                          },
                        },
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                  />
                </label>
                <label className="block text-sm">
                  <span className="mb-1 block font-medium">URL (EN)</span>
                  <input
                    value={form.locales.en.url}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        locales: {
                          ...prev.locales,
                          en: { ...prev.locales.en, url: event.target.value },
                        },
                      }))
                    }
                    className="w-full rounded border border-gray-300 px-3 py-2"
                    placeholder="/en or https://…"
                  />
                </label>
              </div>
            )}

            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.enabled}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      enabled: event.target.checked,
                    }))
                  }
                />
                Enabled
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.openInNewTab}
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      openInNewTab: event.target.checked,
                    }))
                  }
                />
                Open in new tab
              </label>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2">
            <div>
              {editingId ? (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => void onDelete()}
                  className="rounded border border-red-300 px-3 py-1.5 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
                >
                  Move to trash
                </button>
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
