/** Depth 0 = top-level. Depth 3 = deepest allowed child. */
export const MAX_MENU_DEPTH = 3;

type ParentRef = { id: string; parentId: string | null };

export function buildParentMap(
  items: ParentRef[],
): Map<string, string | null> {
  return new Map(items.map((item) => [item.id, item.parentId]));
}

/** Number of hops from this item up to a root (0 for top-level). */
export function getItemDepth(
  id: string,
  parentById: Map<string, string | null>,
): number {
  let depth = 0;
  let current: string | null = id;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) return depth;
    seen.add(current);
    const parent: string | null = parentById.get(current) ?? null;
    if (!parent) break;
    depth += 1;
    current = parent;
    if (depth > MAX_MENU_DEPTH + 2) break;
  }

  return depth;
}

/** Deepest descendant distance below this node (0 if no children). */
export function getSubtreeHeight(
  id: string,
  childrenByParent: Map<string, string[]>,
): number {
  const children = childrenByParent.get(id) ?? [];
  if (children.length === 0) return 0;
  let max = 0;
  for (const childId of children) {
    max = Math.max(max, 1 + getSubtreeHeight(childId, childrenByParent));
  }
  return max;
}

export function buildChildrenMap(
  items: ParentRef[],
): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const item of items) {
    if (!item.parentId) continue;
    const list = map.get(item.parentId) ?? [];
    list.push(item.id);
    map.set(item.parentId, list);
  }
  return map;
}

/**
 * True if placing `sourceId` under `newParentId` (or top-level when null)
 * would keep every node within MAX_MENU_DEPTH.
 */
export function canPlaceUnderParent(
  sourceId: string,
  newParentId: string | null,
  items: ParentRef[],
): boolean {
  if (newParentId === sourceId) return false;

  const parentById = buildParentMap(items);
  const childrenByParent = buildChildrenMap(items);

  // Prevent cycles: new parent cannot be inside source subtree.
  let walk: string | null = newParentId;
  while (walk) {
    if (walk === sourceId) return false;
    walk = parentById.get(walk) ?? null;
  }

  const parentDepth = newParentId
    ? getItemDepth(newParentId, parentById)
    : -1;
  const sourceHeight = getSubtreeHeight(sourceId, childrenByParent);
  const resultingDepth = parentDepth + 1 + sourceHeight;
  return resultingDepth <= MAX_MENU_DEPTH;
}

export function depthLabel(depth: number): string {
  if (depth <= 0) return "Top";
  if (depth === 1) return "L1";
  if (depth === 2) return "L2";
  return "L3";
}
