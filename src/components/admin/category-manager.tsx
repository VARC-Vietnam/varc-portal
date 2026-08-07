"use client";

import {
  useMemo,
  useState,
  useTransition,
  type DragEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  deleteCategoryAction,
  reorderCategoriesAction,
} from "@/lib/actions";
import type { AdminCategoryItem } from "@/lib/cms";
import {
  MAX_CATEGORY_DEPTH,
  buildParentMap,
  canPlaceUnderParent,
  categoryIndentLabel,
  depthLabel,
  flattenCategoryTree,
  getItemDepth,
  toReorderPayload,
} from "@/lib/category-tree";
import {
  CategoryEditorModal,
  type CategoryParentOption,
} from "@/components/admin/category-editor";
import { emptyCategoryForm } from "@/lib/validations/article";
import type { CategoryFormValues } from "@/lib/validations/article";
import { AdminLocaleStatus } from "@/components/admin/admin-locale-status";
import {
  EditIcon,
  TrashIcon,
} from "@/components/admin/admin-action-icons";
import {
  IconActionButton,
  RowActionsGroup,
} from "@/components/admin/icon-action-button";
import { useConfirm } from "@/components/admin/use-confirm";
import { notifyAction } from "@/components/admin/admin-toast";

type Props = {
  initialItems: AdminCategoryItem[];
  /** Open edit modal for this category id on mount. */
  initialEditId?: string | null;
  /** Open create modal with this parent on mount. */
  initialParentId?: string | null;
};

type DropMode = "before" | "into" | "after";

type SiblingMeta = { index: number; count: number };

type EditorState = {
  categoryId?: string;
  isSystem: boolean;
  initial: CategoryFormValues;
};

function buildSiblingMeta(
  displayItems: AdminCategoryItem[],
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

function resolveDropMode(event: DragEvent<HTMLElement>): DropMode {
  const rect = event.currentTarget.getBoundingClientRect();
  const ratio = (event.clientY - rect.top) / Math.max(rect.height, 1);
  if (ratio < 0.28) return "before";
  if (ratio > 0.72) return "after";
  return "into";
}

function applyDrop(
  items: AdminCategoryItem[],
  sourceId: string,
  targetId: string,
  mode: DropMode,
): AdminCategoryItem[] | null {
  if (sourceId === targetId) return null;

  const source = items.find((item) => item.id === sourceId);
  const target = items.find((item) => item.id === targetId);
  if (!source || !target) return null;

  const refs = items.map((item) => ({
    id: item.id,
    parentId: item.parentId,
  }));

  let nextParentId: string | null;
  if (mode === "into") {
    nextParentId = targetId;
  } else {
    nextParentId = target.parentId;
  }

  if (source.isBuiltin && nextParentId) return null;
  if (!canPlaceUnderParent(sourceId, nextParentId, refs)) return null;

  const without = items.filter((item) => item.id !== sourceId);
  const moved: AdminCategoryItem = { ...source, parentId: nextParentId };

  const siblings = without.filter((item) => item.parentId === nextParentId);
  const others = without.filter((item) => item.parentId !== nextParentId);

  let insertAt = siblings.findIndex((item) => item.id === targetId);
  if (mode === "into") {
    siblings.push(moved);
  } else if (mode === "before") {
    if (insertAt < 0) insertAt = siblings.length;
    siblings.splice(insertAt, 0, moved);
  } else {
    if (insertAt < 0) insertAt = siblings.length - 1;
    siblings.splice(insertAt + 1, 0, moved);
  }

  const merged = [...others, ...siblings];
  const payload = toReorderPayload(merged);
  const orderById = new Map(payload.map((entry) => [entry.id, entry]));
  return merged.map((item) => {
    const next = orderById.get(item.id);
    return next
      ? { ...item, parentId: next.parentId, sortOrder: next.sortOrder }
      : item;
  });
}

function moveSibling(
  items: AdminCategoryItem[],
  id: string,
  direction: -1 | 1,
): AdminCategoryItem[] | null {
  const item = items.find((entry) => entry.id === id);
  if (!item) return null;
  const siblings = items
    .filter((entry) => entry.parentId === item.parentId)
    .sort((a, b) => a.sortOrder - b.sortOrder || (a.id < b.id ? -1 : 1));
  const index = siblings.findIndex((entry) => entry.id === id);
  const swapWith = siblings[index + direction];
  if (!swapWith) return null;

  const next = items.map((entry) => {
    if (entry.id === id) return { ...entry, sortOrder: swapWith.sortOrder };
    if (entry.id === swapWith.id) return { ...entry, sortOrder: item.sortOrder };
    return entry;
  });
  const payload = toReorderPayload(next);
  const orderById = new Map(payload.map((entry) => [entry.id, entry]));
  return next.map((entry) => {
    const ordered = orderById.get(entry.id);
    return ordered
      ? { ...entry, parentId: ordered.parentId, sortOrder: ordered.sortOrder }
      : entry;
  });
}

function itemToForm(item: AdminCategoryItem): CategoryFormValues {
  return {
    parentId: item.parentId,
    locales: {
      vi: { name: item.viName, description: item.viDescription },
      en: { name: item.enName, description: item.enDescription },
    },
  };
}

export function CategoryManager({
  initialItems,
  initialEditId = null,
  initialParentId = null,
}: Props) {
  const router = useRouter();
  const { ask, modal: confirmModal } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [optimisticItems, setOptimisticItems] = useState<AdminCategoryItem[] | null>(
    null,
  );
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [dropMode, setDropMode] = useState<DropMode>("before");
  const [syncedInitial, setSyncedInitial] = useState(initialItems);
  const [editor, setEditor] = useState<EditorState | null>(() => {
    if (initialEditId) {
      const item = initialItems.find((entry) => entry.id === initialEditId);
      if (item) {
        return {
          categoryId: item.id,
          isSystem: item.isBuiltin,
          initial: itemToForm(item),
        };
      }
    }
    if (initialParentId) {
      const parent = initialItems.find((entry) => entry.id === initialParentId);
      if (parent) {
        return {
          isSystem: false,
          initial: { ...emptyCategoryForm, parentId: initialParentId },
        };
      }
    }
    return null;
  });

  if (syncedInitial !== initialItems) {
    setSyncedInitial(initialItems);
    setOptimisticItems(null);
  }

  const items = optimisticItems ?? initialItems;
  const displayItems = useMemo(() => flattenCategoryTree(items), [items]);
  const siblingMeta = useMemo(
    () => buildSiblingMeta(displayItems),
    [displayItems],
  );
  const parentById = useMemo(
    () =>
      buildParentMap(
        displayItems.map((item) => ({ id: item.id, parentId: item.parentId })),
      ),
    [displayItems],
  );
  const parentOptions: CategoryParentOption[] = useMemo(
    () =>
      displayItems.map((item) => {
        const depth = getItemDepth(item.id, parentById);
        return {
          id: item.id,
          label: categoryIndentLabel(item.name, depth),
          parentId: item.parentId,
          depth,
        };
      }),
    [displayItems, parentById],
  );

  function openCreate(parentId: string | null = null) {
    setEditor({
      isSystem: false,
      initial: { ...emptyCategoryForm, parentId },
    });
  }

  function openEdit(item: AdminCategoryItem) {
    setEditor({
      categoryId: item.id,
      isSystem: item.isBuiltin,
      initial: itemToForm(item),
    });
  }

  async function onDelete(item: AdminCategoryItem) {
    if (item.isBuiltin) return;
    const confirmed = await ask({
      title: "Move to trash",
      message:
        "Move this category to trash? Articles in it will be assigned to Uncategorized. Child categories move up one level.",
      confirmLabel: "Move to trash",
      variant: "danger",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteCategoryAction(item.id);
      if (!notifyAction(result, "Moved to trash")) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function persist(next: AdminCategoryItem[]) {
    setError(null);
    setOptimisticItems(next);
    startTransition(async () => {
      const result = await reorderCategoriesAction({
        items: toReorderPayload(next),
      });
      if (!notifyAction(result, "Category order saved")) {
        setError(result.error);
        setOptimisticItems(null);
        return;
      }
      router.refresh();
    });
  }

  function onDragStart(event: DragEvent<HTMLElement>, id: string) {
    setDragId(id);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function onDragOver(event: DragEvent<HTMLElement>, id: string) {
    event.preventDefault();
    if (!dragId || dragId === id) return;
    setOverId(id);
    setDropMode(resolveDropMode(event));
  }

  function onDrop(event: DragEvent<HTMLElement>, targetId: string) {
    event.preventDefault();
    const sourceId = dragId || event.dataTransfer.getData("text/plain");
    const mode = resolveDropMode(event);
    setDragId(null);
    setOverId(null);
    if (!sourceId) return;
    const next = applyDrop(items, sourceId, targetId, mode);
    if (!next) {
      setError(
        `Cannot nest deeper than ${MAX_CATEGORY_DEPTH} levels, or move a built-in category under another.`,
      );
      return;
    }
    persist(next);
  }

  function onDragEnd() {
    setDragId(null);
    setOverId(null);
  }

  function rowActions(item: AdminCategoryItem, depth: number) {
    const canAddChild = !item.isBuiltin && depth < MAX_CATEGORY_DEPTH;
    return (
      <RowActionsGroup>
        {canAddChild ? (
          <IconActionButton
            label="Add child"
            onClick={() => openCreate(item.id)}
          >
            <span className="text-sm font-semibold leading-none">+</span>
          </IconActionButton>
        ) : null}
        <IconActionButton label="Edit" onClick={() => openEdit(item)}>
          <EditIcon />
        </IconActionButton>
        {!item.isBuiltin ? (
          <IconActionButton
            label="Move to trash"
            variant="danger"
            disabled={pending}
            onClick={() => void onDelete(item)}
          >
            <TrashIcon />
          </IconActionButton>
        ) : null}
      </RowActionsGroup>
    );
  }

  return (
    <>
      <div className="mt-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-gray-600">
            Nest up to {MAX_CATEGORY_DEPTH} levels. Use ↑ ↓ to reorder
            <span className="hidden md:inline">
              ; on desktop, drag onto a row to nest, or to the top/bottom edge to
              reorder
            </span>
            .
          </p>
          <button
            type="button"
            onClick={() => openCreate(null)}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            New category
          </button>
        </div>

        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        {displayItems.length === 0 ? (
          <p className="text-gray-600">No categories yet.</p>
        ) : (
          <>
            <ul className="space-y-3 md:hidden">
              {displayItems.map((item) => {
                const depth = getItemDepth(item.id, parentById);
                const meta = siblingMeta.get(item.id) ?? { index: 0, count: 1 };
                const canMoveUp = meta.index > 0;
                const canMoveDown = meta.index < meta.count - 1;

                return (
                  <li
                    key={item.id}
                    className={`rounded-lg border border-gray-200 p-4 ${
                      depth > 0 ? "bg-gray-50/80" : "bg-white"
                    }`}
                    style={
                      depth > 0
                        ? { marginLeft: `${Math.min(depth, 3) * 0.75}rem` }
                        : undefined
                    }
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {depth > 0 ? (
                            <span className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                              {depthLabel(depth)}
                            </span>
                          ) : null}
                          {item.isBuiltin ? (
                            <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-gray-600 uppercase">
                              Built-in
                            </span>
                          ) : null}
                        </div>
                        <p className="mt-1 font-medium text-gray-900">
                          {item.name}
                        </p>
                        <p className="mt-1 font-mono text-xs text-gray-500">
                          {item.slug || "—"}
                        </p>
                        <div className="mt-2">
                          <AdminLocaleStatus
                            viReady={item.viReady}
                            enReady={item.enReady}
                          />
                        </div>
                      </div>
                      {rowActions(item, depth)}
                    </div>
                    <div className="mt-3 flex items-center gap-1">
                      <button
                        type="button"
                        aria-disabled={
                          pending || !canMoveUp ? true : undefined
                        }
                        onClick={() => {
                          if (!canMoveUp || pending) return;
                          const next = moveSibling(items, item.id, -1);
                          if (next) persist(next);
                        }}
                        className={`rounded border border-gray-300 px-2.5 py-1.5 text-xs ${
                          pending || !canMoveUp
                            ? "cursor-not-allowed opacity-40"
                            : ""
                        }`}
                        aria-label="Move up"
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        aria-disabled={
                          pending || !canMoveDown ? true : undefined
                        }
                        onClick={() => {
                          if (!canMoveDown || pending) return;
                          const next = moveSibling(items, item.id, 1);
                          if (next) persist(next);
                        }}
                        className={`rounded border border-gray-300 px-2.5 py-1.5 text-xs ${
                          pending || !canMoveDown
                            ? "cursor-not-allowed opacity-40"
                            : ""
                        }`}
                        aria-label="Move down"
                      >
                        ↓
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>

            <div className="hidden overflow-x-auto rounded-lg border border-gray-200 bg-white md:block">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                  <tr>
                    <th
                      className="w-10 px-2 py-3 font-medium"
                      aria-label="Drag"
                    />
                    <th className="px-4 py-3 font-medium">Order</th>
                    <th className="px-4 py-3 font-medium">Name (VI)</th>
                    <th className="px-4 py-3 font-medium">Slug</th>
                    <th className="px-4 py-3 font-medium">Languages</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item) => {
                    const depth = getItemDepth(item.id, parentById);
                    const meta = siblingMeta.get(item.id) ?? {
                      index: 0,
                      count: 1,
                    };
                    const canMoveUp = meta.index > 0;
                    const canMoveDown = meta.index < meta.count - 1;
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
                              aria-disabled={
                                pending || !canMoveUp ? true : undefined
                              }
                              onClick={() => {
                                if (!canMoveUp || pending) return;
                                const next = moveSibling(items, item.id, -1);
                                if (next) persist(next);
                              }}
                              className={`rounded border border-gray-300 px-2 py-1 text-xs ${
                                pending || !canMoveUp
                                  ? "cursor-not-allowed opacity-40"
                                  : ""
                              }`}
                              aria-label="Move up"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              aria-disabled={
                                pending || !canMoveDown ? true : undefined
                              }
                              onClick={() => {
                                if (!canMoveDown || pending) return;
                                const next = moveSibling(items, item.id, 1);
                                if (next) persist(next);
                              }}
                              className={`rounded border border-gray-300 px-2 py-1 text-xs ${
                                pending || !canMoveDown
                                  ? "cursor-not-allowed opacity-40"
                                  : ""
                              }`}
                              aria-label="Move down"
                            >
                              ↓
                            </button>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium">
                          <div
                            className="flex items-center gap-2"
                            style={{
                              paddingLeft: `${Math.min(depth, 3) * 1.25}rem`,
                            }}
                          >
                            {depth > 0 ? (
                              <span className="shrink-0 rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-gray-500 uppercase">
                                {depthLabel(depth)}
                              </span>
                            ) : null}
                            <span>{item.name}</span>
                            {item.isBuiltin ? (
                              <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-gray-600 uppercase">
                                Built-in
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-gray-500">
                          {item.slug || "—"}
                        </td>
                        <td className="px-4 py-3">
                          <AdminLocaleStatus
                            viReady={item.viReady}
                            enReady={item.enReady}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          {rowActions(item, depth)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="hidden text-xs text-gray-500 md:block">
              Tip: drop on the middle of a row to make a child; drop near the
              top or bottom edge to reorder as a sibling.
            </p>
          </>
        )}
      </div>

      <CategoryEditorModal
        key={
          editor
            ? `${editor.categoryId ?? "new"}-${editor.initial.parentId ?? "root"}`
            : "closed"
        }
        open={Boolean(editor)}
        categoryId={editor?.categoryId}
        initial={editor?.initial ?? emptyCategoryForm}
        isSystem={editor?.isSystem}
        parentOptions={parentOptions}
        onClose={() => setEditor(null)}
      />
      {confirmModal}
    </>
  );
}
