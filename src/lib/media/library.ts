import { connectDb } from "@/lib/db";
import { deletedFilter, notDeletedFilter } from "@/lib/soft-delete";
import { Media, type MediaKind } from "@/models/Media";
import type { AdminMediaItem } from "@/lib/media/types";

export type { AdminMediaItem, MediaKind } from "@/lib/media/types";
export { formatBytes } from "@/lib/media/types";

export const MEDIA_PAGE_SIZE = 24;

type MediaLean = {
  _id: { toString(): string };
  key: string;
  url: string;
  contentType: string;
  kind: MediaKind;
  size: number;
  originalName: string;
  alt?: string | null;
  createdAt?: Date | null;
  deletedAt?: Date | null;
};

function toAdminItem(doc: MediaLean): AdminMediaItem {
  return {
    id: String(doc._id),
    key: doc.key,
    url: doc.url,
    contentType: doc.contentType,
    kind: doc.kind,
    size: doc.size,
    originalName: doc.originalName,
    alt: doc.alt ?? "",
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
    deletedAt: doc.deletedAt ? new Date(doc.deletedAt).toISOString() : null,
  };
}

export type MediaListResult = {
  items: AdminMediaItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function listMediaAdmin(options?: {
  trash?: boolean;
  page?: number;
  pageSize?: number;
}): Promise<MediaListResult> {
  await connectDb();
  const pageSize = Math.max(1, options?.pageSize ?? MEDIA_PAGE_SIZE);
  const requestedPage = Math.max(1, options?.page ?? 1);
  const filter = options?.trash ? deletedFilter : notDeletedFilter;

  const total = await Media.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const page = Math.min(requestedPage, totalPages);

  const docs = await Media.find(filter)
    .sort(options?.trash ? { deletedAt: -1 } : { createdAt: -1 })
    .skip((page - 1) * pageSize)
    .limit(pageSize)
    .lean<MediaLean[]>();

  return {
    items: docs.map(toAdminItem),
    total,
    page,
    pageSize,
    totalPages,
  };
}

export async function countMedia(options?: {
  trash?: boolean;
}): Promise<number> {
  await connectDb();
  const filter = options?.trash ? deletedFilter : notDeletedFilter;
  return Media.countDocuments(filter);
}
