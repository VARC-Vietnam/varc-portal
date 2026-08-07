import { createHash } from "node:crypto";
import type { RedisClientType } from "redis";
import { getValkey } from "@/lib/cache/valkey";
import { logServerError } from "@/lib/safe-error";

/** Safety TTL — primary freshness is generation bump + tag cleanup on write. */
export const CMS_CACHE_TTL_SEC = 3600;

/** Monotonic generation; INCR on every CMS write so readers never use pre-write keys. */
const CMS_GEN_KEY = "cms:gen";

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

async function readGeneration(client: RedisClientType): Promise<number> {
  const raw = await client.get(CMS_GEN_KEY);
  if (raw == null) return 0;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : 0;
}

function versionedDataKey(gen: number, key: string): string {
  return `g${gen}:${key}`;
}

function versionedTagKey(gen: number, tag: CmsCacheTag): string {
  return `g${gen}:tag:${tag}`;
}

/**
 * Cache-aside: GET JSON or run loader, SET + register tags. Fail-open to loader.
 * Keys are namespaced by a Valkey generation so invalidation cannot miss entries
 * when tag sets were evicted under allkeys-lru.
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
  let gen = 0;

  if (client) {
    try {
      gen = await readGeneration(client);
      const hit = await client.get(versionedDataKey(gen, key));
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
      // Re-read generation so we never write into a generation that was
      // invalidated while the loader ran (classic stampede after publish).
      gen = await readGeneration(client);
      const vKey = versionedDataKey(gen, key);
      const allTags = [
        ...tags,
        ...(options?.tagsFromValue ? options.tagsFromValue(value) : []),
      ];
      const uniqueTags = [...new Set(allTags.filter(Boolean))];
      const payload = JSON.stringify(value);
      const multi = client.multi();
      multi.set(vKey, payload, { EX: ttlSec });
      for (const tag of uniqueTags) {
        const tKey = versionedTagKey(gen, tag);
        multi.sAdd(tKey, vKey);
        // Keep tag sets from living forever if keys expire via TTL.
        multi.expire(tKey, ttlSec + 60);
      }
      await multi.exec();
    } catch (error) {
      logServerError("valkey set", error);
    }
  }

  return value;
}

/**
 * Bust CMS cache: bump generation (authoritative), then best-effort delete
 * previous generation keys via tag sets (sets may already be LRU-evicted).
 * Never throws — invalidation must not break admin saves.
 */
export async function invalidateCmsTags(
  ...tags: CmsCacheTag[]
): Promise<void> {
  const unique = [...new Set(tags.filter(Boolean))];
  const client = await getValkey();
  if (!client) return;

  try {
    const prevGen = await readGeneration(client);
    await client.incr(CMS_GEN_KEY);

    if (unique.length === 0) return;

    const keysToDelete = new Set<string>();
    for (const tag of unique) {
      const tKey = versionedTagKey(prevGen, tag);
      const members = await client.sMembers(tKey);
      for (const member of members) keysToDelete.add(member);
      keysToDelete.add(tKey);
      // Legacy unversioned tag keys from before generation namespacing.
      keysToDelete.add(`tag:${tag}`);
    }
    if (keysToDelete.size > 0) {
      await client.del([...keysToDelete]);
    }
  } catch (error) {
    logServerError("valkey invalidate", error);
  }
}

/** Best-effort delete of logical cache keys under the current generation. */
export async function deleteCmsKeys(...keys: string[]): Promise<void> {
  const unique = [...new Set(keys.filter(Boolean))];
  if (unique.length === 0) return;

  const client = await getValkey();
  if (!client) return;

  try {
    const gen = await readGeneration(client);
    const versioned = unique.map((key) => versionedDataKey(gen, key));
    // Also drop legacy unversioned keys if any remain.
    await client.del([...versioned, ...unique]);
  } catch (error) {
    logServerError("valkey delete keys", error);
  }
}
