'use client';

import api from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/api-endpoints';
import type { Category } from '@/types/category';
import type { SearchableSelectItem } from '@/components/ui/SearchableSelect';

function getDescendantIds(categories: Category[], rootId: string): Set<string> {
  const childrenMap = new Map<string, string[]>();
  for (const cat of categories) {
    if (cat.parentId) {
      if (!childrenMap.has(cat.parentId)) childrenMap.set(cat.parentId, []);
      childrenMap.get(cat.parentId)!.push(cat.id);
    }
  }

  const result = new Set<string>();
  const queue = [rootId];
  while (queue.length) {
    const id = queue.shift()!;
    result.add(id);
    const children = childrenMap.get(id) ?? [];
    queue.push(...children);
  }
  return result;
}

interface BuildTreeOpts {
  excludeId?: string;
  search?: string;
}

/**
 * Fetches categories (server-side searched when a query is provided) and
 * returns hierarchically-sorted SearchableSelect items with indentation
 * matching parent-child depth. Excludes the current category + its descendants
 * to prevent cycles.
 */
export async function fetchCategoryParentOptions(
  opts: BuildTreeOpts = {},
): Promise<SearchableSelectItem[]> {
  const url = API_ENDPOINTS.categories.list(
    1,
    100,
    opts.search ? { search: opts.search } : undefined,
  );
  const res = await api.get(url);
  const categories: Category[] = res.data?.data ?? [];

  const excluded = opts.excludeId
    ? getDescendantIds(categories, opts.excludeId)
    : new Set<string>();

  const allowed = categories.filter((c) => !excluded.has(c.id));
  const byId = new Map(allowed.map((c) => [c.id, c]));

  // Compute depth by walking parent chain within `allowed` set.
  const depthCache = new Map<string, number>();
  const depthOf = (id: string): number => {
    if (depthCache.has(id)) return depthCache.get(id)!;
    const cat = byId.get(id);
    if (!cat?.parentId || !byId.has(cat.parentId)) {
      depthCache.set(id, 0);
      return 0;
    }
    const d = depthOf(cat.parentId) + 1;
    depthCache.set(id, d);
    return d;
  };

  // Hierarchical sort: roots first (alphabetical), each followed by its
  // descendants. When searching we flatten alphabetically since the result
  // may not contain full ancestry.
  if (opts.search) {
    return allowed
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((c) => ({
        value: c.id,
        label: c.name,
        sublabel: c.parent?.name ? `under ${c.parent.name}` : undefined,
      }));
  }

  const childrenByParent = new Map<string | null, Category[]>();
  for (const c of allowed) {
    const key = c.parentId && byId.has(c.parentId) ? c.parentId : null;
    if (!childrenByParent.has(key)) childrenByParent.set(key, []);
    childrenByParent.get(key)!.push(c);
  }
  for (const arr of childrenByParent.values()) {
    arr.sort((a, b) => a.name.localeCompare(b.name));
  }

  const items: SearchableSelectItem[] = [];
  const walk = (parentId: string | null) => {
    const children = childrenByParent.get(parentId) ?? [];
    for (const child of children) {
      items.push({
        value: child.id,
        label: child.name,
        indent: depthOf(child.id),
      });
      walk(child.id);
    }
  };
  walk(null);

  return items;
}
