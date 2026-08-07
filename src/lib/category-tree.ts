import {
  MAX_MENU_DEPTH,
  buildParentMap,
  canPlaceUnderParent,
  depthLabel,
  getItemDepth,
} from "@/lib/menu-tree";

/** Same nesting limit as menus (depth 0 = top-level). */
export const MAX_CATEGORY_DEPTH = MAX_MENU_DEPTH;

export {
  buildParentMap,
  canPlaceUnderParent,
  depthLabel,
  getItemDepth,
};

export type CategoryTreeNode = {
  id: string;
  parentId: string | null;
  sortOrder: number;
  name: string;
  slug: string;
  isSystem: boolean;
  isBuiltin: boolean;
  viReady: boolean;
  enReady: boolean;
  deletedAt?: string | null;
};

export type CategorySelectOption = {
  id: string;
  label: string;
  depth: number;
  parentId: string | null;
};

function bySortOrder(a: { sortOrder: number; id: string }, b: { sortOrder: number; id: string }) {
  const orderA = Number(a.sortOrder) || 0;
  const orderB = Number(b.sortOrder) || 0;
  if (orderA !== orderB) return orderA - orderB;
  if (a.id < b.id) return -1;
  if (a.id > b.id) return 1;
  return 0;
}

/** Depth-first flatten for admin tables and selectors. Orphans treated as roots. */
export function flattenCategoryTree<T extends { id: string; parentId: string | null; sortOrder: number }>(
  items: T[],
): T[] {
  const normalized = items.map((item) => ({
    ...item,
    parentId: item.parentId ? String(item.parentId) : null,
    id: String(item.id),
  }));
  const ids = new Set(normalized.map((item) => item.id));
  const roots = normalized
    .filter((item) => !item.parentId || !ids.has(item.parentId))
    .sort(bySortOrder);
  const childrenByParent = new Map<string, typeof normalized>();
  for (const item of normalized) {
    if (!item.parentId || !ids.has(item.parentId)) continue;
    const list = childrenByParent.get(item.parentId) ?? [];
    list.push(item);
    childrenByParent.set(item.parentId, list);
  }

  const result: typeof normalized = [];
  const placed = new Set<string>();

  function walk(node: (typeof normalized)[number], forcedParentId: string | null) {
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

export function categoryIndentLabel(name: string, depth: number): string {
  if (depth <= 0) return name;
  return `${"— ".repeat(depth)}${name}`;
}

export function toReorderPayload(
  items: Array<{ id: string; parentId: string | null }>,
): Array<{ id: string; parentId: string | null; sortOrder: number }> {
  const display = flattenCategoryTree(
    items.map((item) => ({ ...item, sortOrder: 0 })),
  );
  const counters = new Map<string | null, number>();
  return display.map((item) => {
    const parentId = item.parentId;
    const sortOrder = counters.get(parentId) ?? 0;
    counters.set(parentId, sortOrder + 1);
    return { id: item.id, parentId, sortOrder };
  });
}
