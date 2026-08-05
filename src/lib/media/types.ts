export type MediaKind = "image" | "video" | "file";

export type AdminMediaItem = {
  id: string;
  key: string;
  url: string;
  contentType: string;
  kind: MediaKind;
  size: number;
  originalName: string;
  alt: string;
  createdAt: string | null;
  deletedAt: string | null;
};

export function formatBytes(size: number): string {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}
