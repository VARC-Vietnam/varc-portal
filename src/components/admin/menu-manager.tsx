"use client";

import {
  useMemo,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  deleteMenuItemAction,
  permanentlyDeleteMenuItemAction,
  reorderMenuItemsAction,
  restoreMenuItemAction,
  saveMenuItemAction,
} from "@/lib/actions";
import type { AdminMenuItem } from "@/lib/cms";
import type { MenuItemFormValues } from "@/lib/validations/article";
import type { MenuLocation } from "@/models/MenuItem";
import { EditIcon, TrashIcon } from "@/components/admin/admin-action-icons";
import {
  IconActionButton,
  RowActionsGroup,
} from "@/components/admin/icon-action-button";
import { TrashRowActions } from "@/components/admin/trash-row-actions";

type PageOption = {
  id: string;
  title: string;
  status: string;
};

type Props = {
  initialItems: AdminMenuItem[];
  pages: PageOption[];
  trash?: boolean;
};

const emptyForm = (location: MenuLocation): MenuItemFormValues => ({
  location,
  type: "page",
  pageId: null,
  locales: {
    vi: { label: "", url: "" },
    en: { label: "", url: "" },
  },
  enabled: true,
  openInNewTab: false,
});

function sortForLocation(
  items: AdminMenuItem[],
  location: MenuLocation,
): AdminMenuItem[] {
  return items
    .filter((item) => item.location === location)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function MenuManager({ initialItems, pages, trash = false }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<MenuLocation>("navigation");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<MenuItemFormValues>(emptyForm("navigation"));
  const [showForm, setShowForm] = useState(false);
  const [optimisticItems, setOptimisticItems] = useState<AdminMenuItem[] | null>(
    null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const serverItems = useMemo(
    () => sortForLocation(initialItems, tab),
    [initialItems, tab],
  );
  const items = optimisticItems ?? serverItems;

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm(tab));
    setShowForm(true);
    setError(null);
  }

  function openEdit(item: AdminMenuItem) {
    setEditingId(item.id);
    setForm({
      location: item.location,
      type: item.type,
      pageId: item.pageId,
      locales: item.locales,
      enabled: item.enabled,
      openInNewTab: item.openInNewTab,
    });
    setShowForm(true);
    setError(null);
  }

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await saveMenuItemAction(editingId, {
        ...form,
        location: tab,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setShowForm(false);
      setEditingId(null);
      setOptimisticItems(null);
      router.refresh();
    });
  }

  function onDelete(id: string) {
    if (!confirm("Move this menu item to trash?")) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteMenuItemAction(id);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (editingId === id) {
        setShowForm(false);
        setEditingId(null);
      }
      setOptimisticItems(null);
      router.refresh();
    });
  }

  function persistOrder(nextItems: AdminMenuItem[]) {
    setOptimisticItems(nextItems);
    setError(null);
    startTransition(async () => {
      const result = await reorderMenuItemsAction({
        location: tab,
        orderedIds: nextItems.map((item) => item.id),
      });
      if (!result.ok) {
        setError(result.error);
        setOptimisticItems(null);
        return;
      }
      setOptimisticItems(null);
      router.refresh();
    });
  }

  function move(id: string, direction: -1 | 1) {
    const index = items.findIndex((item) => item.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= items.length) return;

    const next = [...items];
    const [removed] = next.splice(index, 1);
    next.splice(target, 0, removed);
    persistOrder(next);
  }

  function reorderByDrag(fromId: string, toId: string) {
    if (fromId === toId) return;
    const fromIndex = items.findIndex((item) => item.id === fromId);
    const toIndex = items.findIndex((item) => item.id === toId);
    if (fromIndex < 0 || toIndex < 0) return;

    const next = [...items];
    const [removed] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, removed);
    persistOrder(next);
  }

  function onDragStart(event: DragEvent<HTMLTableRowElement>, id: string) {
    if (pending) {
      event.preventDefault();
      return;
    }
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(event: DragEvent<HTMLTableRowElement>, id: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    if (overId !== id) setOverId(id);
  }

  function onDrop(event: DragEvent<HTMLTableRowElement>, targetId: string) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || dragId;
    setDragId(null);
    setOverId(null);
    if (!sourceId) return;
    reorderByDrag(sourceId, targetId);
  }

  function onDragEnd() {
    setDragId(null);
    setOverId(null);
  }

  function switchTab(next: MenuLocation) {
    setTab(next);
    setOptimisticItems(null);
    setShowForm(false);
    setEditingId(null);
    setError(null);
    setDragId(null);
    setOverId(null);
  }

  const trashItems = useMemo(
    () =>
      [...initialItems].sort((a, b) => {
        const aTime = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const bTime = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return bTime - aTime;
      }),
    [initialItems],
  );

  if (trash) {
    return (
      <div className="space-y-4">
        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {trashItems.length === 0 ? (
          <p className="text-gray-600">Trash is empty.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Label</th>
                  <th className="px-4 py-3 font-medium">Menu</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                  <th className="px-4 py-3 font-medium">Deleted</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trashItems.map((item) => {
                  const label =
                    item.locales.vi.label ||
                    item.pageTitle ||
                    item.locales.en.label ||
                    "(untitled)";
                  return (
                    <tr key={item.id} className="border-b border-gray-100">
                      <td className="px-4 py-3 font-medium">{label}</td>
                      <td className="px-4 py-3 capitalize">{item.location}</td>
                      <td className="px-4 py-3 capitalize">
                        {item.type === "page" ? "Page" : "Custom"}
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {item.deletedAt
                          ? new Date(item.deletedAt).toLocaleString("vi-VN")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TrashRowActions
                          restoreAction={restoreMenuItemAction.bind(null, item.id)}
                          deleteAction={permanentlyDeleteMenuItemAction.bind(
                            null,
                            item.id,
                          )}
                          itemLabel={label}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => switchTab("navigation")}
            className={`rounded px-3 py-1.5 text-sm ${
              tab === "navigation"
                ? "bg-gray-900 text-white"
                : "border border-gray-300"
            }`}
          >
            Navigation Menu
          </button>
          <button
            type="button"
            onClick={() => switchTab("footer")}
            className={`rounded px-3 py-1.5 text-sm ${
              tab === "footer"
                ? "bg-gray-900 text-white"
                : "border border-gray-300"
            }`}
          >
            Footer Menu
          </button>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          Add item
        </button>
      </div>

      <p className="text-sm text-gray-600">
        {tab === "navigation"
          ? "Items shown in the site header (after Home)."
          : "Items shown in the site footer."}{" "}
        Drag rows to reorder, or use the arrows.
      </p>

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {showForm ? (
        <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
          <h2 className="text-base font-semibold">
            {editingId ? "Edit menu item" : "New menu item"}
          </h2>

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
                  setForm((prev) => ({ ...prev, type: "custom", pageId: null }))
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
                        vi: { ...prev.locales.vi, label: event.target.value },
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
                        en: { ...prev.locales.en, label: event.target.value },
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
                        vi: { ...prev.locales.vi, label: event.target.value },
                      },
                    }))
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2"
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
                        en: { ...prev.locales.en, label: event.target.value },
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

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={onSave}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
              className="rounded border border-gray-300 px-4 py-2 text-sm hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {items.length === 0 ? (
        <p className="text-gray-600">No items in this menu yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="w-10 px-2 py-3 font-medium" aria-label="Drag" />
                <th className="px-4 py-3 font-medium">Order</th>
                <th className="px-4 py-3 font-medium">Label</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                const label =
                  item.locales.vi.label ||
                  item.pageTitle ||
                  item.locales.en.label ||
                  "(untitled)";
                const isDragging = dragId === item.id;
                const isOver = overId === item.id && dragId !== item.id;

                return (
                  <tr
                    key={item.id}
                    draggable={!pending}
                    onDragStart={(event) => onDragStart(event, item.id)}
                    onDragOver={(event) => onDragOver(event, item.id)}
                    onDrop={(event) => onDrop(event, item.id)}
                    onDragEnd={onDragEnd}
                    className={`border-b border-gray-100 ${
                      isDragging ? "bg-gray-100 opacity-60" : ""
                    } ${isOver ? "border-t-2 border-t-gray-900" : ""} ${
                      pending ? "cursor-wait" : "cursor-grab active:cursor-grabbing"
                    }`}
                  >
                    <td className="px-2 py-3 text-center text-gray-400">
                      <span
                        className="inline-block select-none px-1"
                        title="Drag to reorder"
                        aria-hidden
                      >
                        ⠿
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={pending || index === 0}
                          onClick={() => move(item.id, -1)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40"
                          aria-label="Move up"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          disabled={pending || index === items.length - 1}
                          onClick={() => move(item.id, 1)}
                          className="rounded border border-gray-300 px-2 py-1 text-xs disabled:opacity-40"
                          aria-label="Move down"
                        >
                          ↓
                        </button>
                        <span className="ml-2 text-gray-500">{index + 1}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium">{label}</td>
                    <td className="px-4 py-3 capitalize">
                      {item.type === "page" ? "Page" : "Custom"}
                      {item.type === "page" && item.pageTitle
                        ? ` · ${item.pageTitle}`
                        : null}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          item.enabled ? "text-green-700" : "text-amber-700"
                        }
                      >
                        {item.enabled ? "Enabled" : "Disabled"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RowActionsGroup>
                        <IconActionButton
                          label="Edit"
                          onClick={() => openEdit(item)}
                        >
                          <EditIcon />
                        </IconActionButton>
                        <IconActionButton
                          label="Move to trash"
                          variant="danger"
                          disabled={pending}
                          onClick={() => onDelete(item.id)}
                        >
                          <TrashIcon />
                        </IconActionButton>
                      </RowActionsGroup>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
