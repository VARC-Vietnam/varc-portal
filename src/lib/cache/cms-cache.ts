import { createHash } from "node:crypto";
import { getValkey } from "@/lib/cache/valkey";
import { logServerError } from "@/lib/safe-error";

/** Safety TTL — primary freshness is tag invalidation on write. */
export const CMS_CACHE_TTL_SEC = 3600;

export const CmsCacheTags = {
  branding: "branding",
  settings: "settings",
  menus: "menus",
  pages: "pages",
  articles: "articles",
  categories: "categories",
  templates: "templates",
  page: (id: string) => `page:${id}`,
  article: (id: string) => `article:${id}`,
} as const;

export type CmsCacheTag = string;

function tagKey(tag: CmsCacheTag): string {
  return `tag:${tag}`;
}

export const CmsCacheKeys = {
  branding: (locale: string) => `cms:branding:${locale}`,
  settings: () => "cms:settings",
  menu: (location: string, locale: string) => `cms:menu:${location}:${locale}`,
  pageBySlug: (locale: string, slug: string) => `cms:page:${locale}:${slug}`,
  pageById: (id: string) => `cms:pageid:${id}`,
  articleBySlug: (locale: string, slug: string) =>
    `cms:article:${locale}:${slug}`,
  articlesList: (
    locale: string,
    page: number,
    pageSize: number,
    excludeHash: string,
  ) => `cms:articles:${locale}:p${page}:s${pageSize}:x${excludeHash}`,
  featured: (locale: string, limit: number) =>
    `cms:featured:${locale}:${limit}`,
  categories: () => "cms:categories",
  templateByKey: (key: string) => `cms:tpl:${key}`,
};

export function hashExcludeIds(ids: string[] | undefined): string {
  if (!ids?.length) return "0";
  const normalized = [...ids].sort().join(",");
  return createHash("sha1").update(normalized).digest("hex").slice(0, 12);
}

/**
 * Cache-aside: GET JSON or run loader, SET + register tags. Fail-open to loader.
 * `tagsFromValue` adds tags after load (e.g. `page:{id}` once the doc is known).
 */
export async function cacheAside<T>(
  key: string,
  tags: CmsCacheTag[],
  loader: () => Promise<T>,
  options?: {
    ttlSec?: number;
    tagsFromValue?: (value: T) => CmsCacheTag[];
  },
): Promise<T> {
  const ttlSec = options?.ttlSec ?? CMS_CACHE_TTL_SEC;
  const client = await getValkey();
  if (client) {
    try {
      const hit = await client.get(key);
      if (hit != null) {
        return JSON.parse(hit) as T;
      }
    } catch (error) {
      logServerError("valkey get", error);
    }
  }

  const value = await loader();

  if (client) {
    try {
      const allTags = [
        ...tags,
        ...(options?.tagsFromValue ? options.tagsFromValue(value) : []),
      ];
      const uniqueTags = [...new Set(allTags.filter(Boolean))];
      const payload = JSON.stringify(value);
      const multi = client.multi();
      multi.set(key, payload, { EX: ttlSec });
      for (const tag of uniqueTags) {
        multi.sAdd(tagKey(tag), key);
        // Keep tag sets from living forever if keys expire via TTL.
        multi.expire(tagKey(tag), ttlSec + 60);
      }
      await multi.exec();
    } catch (error) {
      logServerError("valkey set", error);
    }
  }

  return value;
}

/**
 * Delete all keys registered under the given tags, then the tag sets themselves.
 * Never throws — invalidation must not break admin saves.
 */
export async function invalidateCmsTags(
  ...tags: CmsCacheTag[]
): Promise<void> {
  const unique = [...new Set(tags.filter(Boolean))];
  if (unique.length === 0) return;

  const client = await getValkey();
  if (!client) return;

  try {
    const keysToDelete = new Set<string>();
    for (const tag of unique) {
      const members = await client.sMembers(tagKey(tag));
      for (const member of members) keysToDelete.add(member);
      keysToDelete.add(tagKey(tag));
    }
    if (keysToDelete.size > 0) {
      await client.del([...keysToDelete]);
    }
  } catch (error) {
    logServerError("valkey invalidate", error);
  }
}
