import path from "node:path";

export type StorageDriver = "local" | "s3";

export const DEFAULT_MEDIA_MAX_BYTES = 5 * 1024 * 1024;

export const DEFAULT_ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/svg+xml",
] as const;

function truthy(value: string | undefined, fallback: boolean): boolean {
  if (value == null || value === "") return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export type MediaConfig =
  | {
      driver: "local";
      uploadDir: string;
      publicBaseUrl: string | null;
      maxBytes: number;
      allowedMime: string[];
    }
  | {
      driver: "s3";
      endpoint: string;
      region: string;
      bucket: string;
      accessKey: string;
      secretKey: string;
      forcePathStyle: boolean;
      publicUrl: string;
      maxBytes: number;
      allowedMime: string[];
    };

function parseAllowedMime(raw: string | undefined): string[] {
  if (!raw?.trim()) return [...DEFAULT_ALLOWED_MIME];
  return raw
    .split(",")
    .map((part) => part.trim().toLowerCase())
    .filter(Boolean);
}

function parseMaxBytes(raw: string | undefined): number {
  if (!raw?.trim()) return DEFAULT_MEDIA_MAX_BYTES;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return DEFAULT_MEDIA_MAX_BYTES;
  return Math.floor(value);
}

export function getMediaConfig(): MediaConfig {
  const driver = (process.env.STORAGE_DRIVER?.trim().toLowerCase() ||
    "local") as StorageDriver;
  const maxBytes = parseMaxBytes(process.env.MEDIA_MAX_BYTES);
  const allowedMime = parseAllowedMime(process.env.MEDIA_ALLOWED_MIME);

  if (driver === "s3") {
    const endpoint = process.env.S3_ENDPOINT?.trim();
    const bucket = process.env.S3_BUCKET?.trim();
    const accessKey = process.env.S3_ACCESS_KEY?.trim();
    const secretKey = process.env.S3_SECRET_KEY?.trim();
    const publicUrl = process.env.S3_PUBLIC_URL?.trim()?.replace(/\/$/, "");

    if (!endpoint || !bucket || !accessKey || !secretKey || !publicUrl) {
      throw new Error(
        "STORAGE_DRIVER=s3 requires S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY, S3_SECRET_KEY, and S3_PUBLIC_URL",
      );
    }

    return {
      driver: "s3",
      endpoint,
      region: process.env.S3_REGION?.trim() || "us-east-1",
      bucket,
      accessKey,
      secretKey,
      forcePathStyle: truthy(process.env.S3_FORCE_PATH_STYLE, true),
      publicUrl,
      maxBytes,
      allowedMime,
    };
  }

  if (driver !== "local") {
    throw new Error(`Unsupported STORAGE_DRIVER: ${driver}`);
  }

  const uploadDir = path.resolve(
    process.env.UPLOAD_DIR?.trim() || path.join(process.cwd(), "uploads"),
  );
  const publicBaseUrl =
    process.env.MEDIA_PUBLIC_BASE_URL?.trim()?.replace(/\/$/, "") || null;

  return {
    driver: "local",
    uploadDir,
    publicBaseUrl,
    maxBytes,
    allowedMime,
  };
}
