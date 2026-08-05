"use client";

import {
  useEffect,
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
import {
  MAX_MENU_DEPTH,
  buildParentMap,
  canPlaceUnderParent,
  depthLabel,
  getItemDepth,
} from "@/lib/menu-tree";
import type { MenuItemFormValues } from "@/lib/validations/article";
import type { MenuLocation } from "@/models/MenuItem";
import { EditIcon, TrashIcon } from "@/components/admin/admin-action-icons";
import {
  IconActionButton,
  RowActionsGroup,
} from "@/components/admin/icon-action-button";
import { TrashRowActions } from "@/components/admin/trash-row-actions";
import { useConfirm } from "@/components/admin/use-confirm";
import { notifyAction } from "@/components/admin/admin-toast";

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

type DropMode = "before" | "into" | "after";

const emptyForm = (location: MenuLocation): MenuItemFormValues => ({
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
});

function bySortOrder(a: AdminMenuItem, b: AdminMenuItem) {
  const orderA = Number(a.sortOrder) || 0;
  const orderB = Number(b.sortOrder) || 0;
  if (orderA !== orderB) return orderA - orderB;
  // Avoid localeCompare — default locale can differ between Node SSR and the browser.
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

function itemLabel(item: AdminMenuItem) {
  return (
    item.locales.vi.label ||
    item.pageTitle ||
    item.locales.en.label ||
    "(untitled)"
  );
}

function toParentRefs(items: AdminMenuItem[]) {
  return items.map((item) => ({
    id: item.id,
    parentId: item.parentId,
  }));
}

type SiblingMeta = { index: number; count: number };

/** Stable per-parent sibling positions from the flattened display list. */
function buildSiblingMeta(
  displayItems: AdminMenuItem[],
): Map<string, SiblingMeta> {
  const groups = new Map<string, string[]>();
  for (const item of displayItems) {
    const key = item.parentId ?? "";
    const list = groups.get(key) ?? [];
    list.push(item.id);
    groups.set(key, list);
  }
  const meta = new Map<string, SiblingMeta>();
  for (const ids of groups.values()) {
    ids.forEach((id, index) => {
      meta.set(id, { index, count: ids.length });
    });
  }
  return meta;
}

/** Depth-first flatten for table display. Orphans treated as roots. */
function flattenForDisplay(items: AdminMenuItem[]): AdminMenuItem[] {
  const normalized = items.map((item) => ({
    ...item,
    parentId: item.parentId ? String(item.parentId) : null,
    id: String(item.id),
  }));
  const ids = new Set(normalized.map((item) => item.id));
  const roots = normalized
    .filter((item) => !item.parentId || !ids.has(item.parentId))
    .sort(bySortOrder);
  const childrenByParent = new Map<string, AdminMenuItem[]>();
  for (const item of normalized) {
    if (!item.parentId || !ids.has(item.parentId)) continue;
    const list = childrenByParent.get(item.parentId) ?? [];
    list.push(item);
    childrenByParent.set(item.parentId, list);
  }

  const result: AdminMenuItem[] = [];
  const placed = new Set<string>();

  function walk(node: AdminMenuItem, forcedParentId: string | null) {
    result.push({ ...node, parentId: forcedParentId });
    placed.add(node.id);
    const children = (childrenByParent.get(node.id) ?? []).sort(bySortOrder);
    for (const child of children) {
      walk(child, node.id);
    }
  }

  for (const root of roots) {
    walk(root, null);
  }
  for (const item of normalized) {
    if (!placed.has(item.id)) {
      result.push({ ...item, parentId: null });
    }
  }
  return result;
}

function isDescendantOf(
  items: AdminMenuItem[],
  ancestorId: string,
  candidateId: string,
): boolean {
  const parentById = buildParentMap(toParentRefs(items));
  let current: string | null = candidateId;
  const seen = new Set<string>();
  while (current) {
    if (current === ancestorId) return true;
    if (seen.has(current)) break;
    seen.add(current);
    current = parentById.get(current) ?? null;
  }
  return false;
}

function toReorderPayload(items: AdminMenuItem[]) {
  const display = flattenForDisplay(items);
  const counters = new Map<string | null, number>();
  return display.map((item) => {
    const parentId = item.parentId;
    const sortOrder = counters.get(parentId) ?? 0;
    counters.set(parentId, sortOrder + 1);
    return { id: item.id, parentId, sortOrder };
  });
}

function resolveDropMode(
  event: DragEvent<HTMLTableRowElement>,
): DropMode {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1);
  if (ratio < 0.28) return "before";
  if (ratio > 0.72) return "after";
  return "into";
}

export function MenuManager({ initialItems, pages, trash = false }: Props) {
  const router = useRouter();
  const { ask, modal } = useConfirm();
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
  const [dropMode, setDropMode] = useState<DropMode>("before");
  // Avoid disabled/class mismatches between Node SSR and browser hydration.
  const [moveControlsReady, setMoveControlsReady] = useState(false);
  useEffect(() => {
    setMoveControlsReady(true);
  }, []);

  const serverItems = useMemo(
    () =>
      initialItems
        .filter((item) => item.location === tab)
        .map((item) => ({
          ...item,
          id: String(item.id),
          parentId: item.parentId ? String(item.parentId) : null,
        })),
    [initialItems, tab],
  );
  const items = optimisticItems ?? serverItems;
  const displayItems = useMemo(() => flattenForDisplay(items), [items]);
  const siblingMeta = useMemo(
    () => buildSiblingMeta(displayItems),
    [displayItems],
  );

  function openCreate(parentId: string | null = null) {
    setEditingId(null);
    setForm({ ...emptyForm(tab), parentId });
    setShowForm(true);
    setError(null);
  }

  function openEdit(item: AdminMenuItem) {
    setEditingId(item.id);
    setForm({
      location: item.location,
      type: item.type,
      pageId: item.pageId,
      parentId: item.parentId,
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
      setShowForm(false);
      setEditingId(null);
      setOptimisticItems(null);
      router.refresh();
    });
  }

  async function onDelete(id: string) {
    const confirmed = await ask({
      title: "Move to trash",
      message:
        "Move this menu item to trash? Any child items become top-level.",
      confirmLabel: "Move to trash",
      variant: "danger",
    });
    if (!confirmed) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteMenuItemAction(id);
      if (!notifyAction(result, "Moved to trash")) {
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

  function persistTree(nextItems: AdminMenuItem[]) {
    setOptimisticItems(nextItems);
    setError(null);
    startTransition(async () => {
      const result = await reorderMenuItemsAction({
        location: tab,
        items: toReorderPayload(nextItems),
      });
      if (!notifyAction(result, "Menu order saved")) {
        setError(result.error);
        setOptimisticItems(null);
        return;
      }
      setOptimisticItems(null);
      router.refresh();
    });
  }

  function moveSibling(id: string, direction: -1 | 1) {
    const item = items.find((entry) => entry.id === id);
    if (!item) return;
    const siblings = items
      .filter((entry) => entry.parentId === item.parentId)
      .sort(bySortOrder);
    const index = siblings.findIndex((entry) => entry.id === id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;

    const reordered = [...siblings];
    const [removed] = reordered.splice(index, 1);
    reordered.splice(target, 0, removed);

    const next = items.map((entry) => {
      const pos = reordered.findIndex((sibling) => sibling.id === entry.id);
      if (pos < 0) return entry;
      return { ...entry, sortOrder: pos };
    });
    persistTree(next);
  }

  function applyDrop(sourceId: string, targetId: string, mode: DropMode) {
    if (sourceId === targetId) return;
    const source = items.find((item) => item.id === sourceId);
    const target = items.find((item) => item.id === targetId);
    if (!source || !target) return;

    const refs = toParentRefs(items);
    let nextParentId: string | null = null;

    if (mode === "into") {
      if (canPlaceUnderParent(sourceId, targetId, refs)) {
        nextParentId = targetId;
        const childIds = items
          .filter((item) => item.parentId === targetId && item.id !== sourceId)
          .sort(bySortOrder)
          .map((item) => item.id);
        childIds.push(sourceId);
        const next = items.map((item) => {
          if (item.id !== sourceId) return item;
          return { ...item, parentId: targetId };
        });
        const withOrder = next.map((item) => {
          if (item.parentId !== targetId && item.id !== sourceId) return item;
          const pos = childIds.indexOf(item.id);
          if (pos < 0) return item;
          return { ...item, parentId: targetId, sortOrder: pos };
        });
        persistTree(withOrder);
        return;
      }
      // Target is at max depth — place as sibling after it instead.
      nextParentId = target.parentId;
      if (!canPlaceUnderParent(sourceId, nextParentId, refs)) {
        setError(
          `Menu items can nest at most ${MAX_MENU_DEPTH} levels deep`,
        );
        return;
      }
      const siblings = items
        .filter((item) => item.parentId === nextParentId)
        .sort(bySortOrder)
        .map((item) => item.id)
        .filter((id) => id !== sourceId);
      const targetIndex = siblings.indexOf(targetId);
      siblings.splice(targetIndex + 1, 0, sourceId);
      const next = items.map((item) => {
        if (item.id !== sourceId) return item;
        return { ...item, parentId: nextParentId };
      });
      const withOrder = next.map((item) => {
        if (item.parentId !== nextParentId && item.id !== sourceId) {
          return item;
        }
        const pos = siblings.indexOf(item.id);
        if (pos < 0) return item;
        return { ...item, parentId: nextParentId, sortOrder: pos };
      });
      persistTree(withOrder);
      return;
    }

    // before / after — same parent as target
    nextParentId = target.parentId;
    if (!canPlaceUnderParent(sourceId, nextParentId, refs)) {
      setError(`Menu items can nest at most ${MAX_MENU_DEPTH} levels deep`);
      return;
    }

    const siblings = items
      .filter((item) => item.parentId === nextParentId)
      .sort(bySortOrder)
      .map((item) => item.id)
      .filter((id) => id !== sourceId);
    const targetIndex = siblings.indexOf(targetId);
    const insertAt = mode === "before" ? targetIndex : targetIndex + 1;
    siblings.splice(Math.max(0, insertAt), 0, sourceId);

    const next = items.map((item) => {
      if (item.id !== sourceId) return item;
      return { ...item, parentId: nextParentId };
    });
    const withOrder = next.map((item) => {
      if (item.parentId !== nextParentId && item.id !== sourceId) return item;
      const pos = siblings.indexOf(item.id);
      if (pos < 0) return item;
      return { ...item, parentId: nextParentId, sortOrder: pos };
    });
    persistTree(withOrder);
  }

  function onDragStart(event: DragEvent<HTMLTableRowElement>, id: string) {
    if (pending) {
      event.preventDefault();
      return;
    }
    setDragId(id);
    setError(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(event: DragEvent<HTMLTableRowElement>, id: string) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const mode = resolveDropMode(event);
    if (overId !== id) setOverId(id);
    if (dropMode !== mode) setDropMode(mode);
  }

  function onDrop(event: DragEvent<HTMLTableRowElement>, targetId: string) {
    event.preventDefault();
    const sourceId = event.dataTransfer.getData("text/plain") || dragId;
    const mode = resolveDropMode(event);
    setDragId(null);
    setOverId(null);
    if (!sourceId) return;
    applyDrop(sourceId, targetId, mode);
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

  const parentById = useMemo(
    () => buildParentMap(toParentRefs(displayItems)),
    [displayItems],
  );

  const parentOptions = displayItems.filter((item) => {
    if (editingId && (item.id === editingId || isDescendantOf(items, editingId, item.id))) {
      return false;
    }
    const depth = getItemDepth(item.id, parentById);
    if (editingId) {
      return canPlaceUnderParent(editingId, item.id, toParentRefs(items));
    }
    // New item: parent must leave room for one more level.
    return depth < MAX_MENU_DEPTH;
  });

  if (trash) {
    return (
      <>
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
                    const label = itemLabel(item);
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
                            restoreAction={restoreMenuItemAction.bind(
                              null,
                              item.id,
                            )}
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
        {modal}
      </>
    );
  }

  return (
    <>
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
            onClick={() => openCreate(null)}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            Add item
          </button>
        </div>

        <p className="text-sm text-gray-600">
          {tab === "navigation"
            ? "Items shown in the site header (after Home)."
            : "Items shown in the site footer."}{" "}
          Nest up to {MAX_MENU_DEPTH} levels. Drag onto a row to nest; drag to
          the top or bottom edge to reorder.
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
                  const depth = getItemDepth(item.id, parentById);
                  const prefix = depth > 0 ? `${"— ".repeat(depth)}` : "";
                  return (
                    <option key={item.id} value={item.id}>
                      {prefix}
                      {itemLabel(item)}
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

        {displayItems.length === 0 ? (
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
                {displayItems.map((item) => {
                  const label = itemLabel(item);
                  const depth = getItemDepth(item.id, parentById);
                  const meta = siblingMeta.get(item.id) ?? {
                    index: 0,
                    count: 1,
                  };
                  const canMoveUp = meta.index > 0;
                  const canMoveDown = meta.index < meta.count - 1;
                  const blockUp =
                    moveControlsReady && (pending || !canMoveUp);
                  const blockDown =
                    moveControlsReady && (pending || !canMoveDown);
                  const isDragging = dragId === item.id;
                  const isOver = overId === item.id && dragId !== item.id;
                  const childCount = displayItems.filter(
                    (entry) => entry.parentId === item.id,
                  ).length;
                  const canAddChild = depth < MAX_MENU_DEPTH;

                  return (
                    <tr
                      key={item.id}
                      draggable={!pending}
                      onDragStart={(event) => onDragStart(event, item.id)}
                      onDragOver={(event) => onDragOver(event, item.id)}
                      onDrop={(event) => onDrop(event, item.id)}
                      onDragEnd={onDragEnd}
                      className={`border-b border-gray-100 ${
                        depth > 0 ? "bg-gray-50/80" : "bg-white"
                      } ${isDragging ? "opacity-60" : ""} ${
                        isOver && dropMode === "before"
                          ? "border-t-2 border-t-gray-900"
                          : ""
                      } ${
                        isOver && dropMode === "after"
                          ? "border-b-2 border-b-gray-900"
                          : ""
                      } ${
                        isOver && dropMode === "into"
                          ? "bg-lime-50 ring-1 ring-inset ring-lime-400"
                          : ""
                      } ${
                        pending
                          ? "cursor-wait"
                          : "cursor-grab active:cursor-grabbing"
                      }`}
                    >
                      <td className="px-2 py-3 text-center text-gray-400">
                        <span
                          className="inline-block select-none px-1"
                          title="Drag to reorder or nest"
                          aria-hidden
                        >
                          ⠿
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            aria-disabled={blockUp ? true : undefined}
                            onClick={() => {
                              if (blockUp || !canMoveUp || pending) return;
                              moveSibling(item.id, -1);
                            }}
                            className={`rounded border border-gray-300 px-2 py-1 text-xs ${
                              blockUp ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            aria-label="Move up"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            aria-disabled={blockDown ? true : undefined}
                            onClick={() => {
                              if (blockDown || !canMoveDown || pending) return;
                              moveSibling(item.id, 1);
                            }}
                            className={`rounded border border-gray-300 px-2 py-1 text-xs ${
                              blockDown ? "cursor-not-allowed opacity-40" : ""
                            }`}
                            aria-label="Move down"
                          >
                            ↓
                          </button>
                          <span className="ml-2 text-gray-500">
                            {meta.index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium">
                        <div
                          className="relative flex min-w-0 items-center gap-2"
                          style={
                            depth > 0
                              ? { paddingLeft: `${depth * 1.5}rem` }
                              : undefined
                          }
                        >
                          {depth > 0 ? (
                            <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                              {depthLabel(depth)}
                            </span>
                          ) : null}
                          <span className="min-w-0 truncate">{label}</span>
                          {childCount > 0 ? (
                            <span className="shrink-0 rounded bg-gray-900 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white uppercase">
                              Nested · {childCount}
                            </span>
                          ) : null}
                        </div>
                      </td>
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
                          {canAddChild ? (
                            <IconActionButton
                              label="Add child"
                              onClick={() => openCreate(item.id)}
                            >
                              <span className="text-sm font-semibold leading-none">
                                +
                              </span>
                            </IconActionButton>
                          ) : null}
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
      {modal}
    </>
  );
}
