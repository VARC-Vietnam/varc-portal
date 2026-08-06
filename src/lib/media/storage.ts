import { randomUUID } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getMediaConfig, type MediaConfig } from "@/lib/media/config";

export type StoredObject = {
  key: string;
  url: string;
  contentType: string;
  size: number;
};

function sanitizeFileName(name: string): string {
  const base = path.basename(name).replace(/[^a-zA-Z0-9._-]+/g, "-");
  const trimmed = base.replace(/^-+|-+$/g, "").slice(0, 80);
  return trimmed || "file";
}

export function buildObjectKey(originalName: string, now = new Date()): string {
  const year = String(now.getUTCFullYear());
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const id = randomUUID().replace(/-/g, "").slice(0, 12);
  return `${year}/${month}/${id}-${sanitizeFileName(originalName)}`;
}

function assertSafeKey(key: string): string {
  const normalized = key.replace(/^\/+/, "").replace(/\\/g, "/");
  if (
    !normalized ||
    normalized.includes("..") ||
    normalized.includes("\0") ||
    path.isAbsolute(normalized) ||
    /^[a-zA-Z]:/.test(normalized) ||
    !/^[a-zA-Z0-9._/-]+$/.test(normalized)
  ) {
    throw new Error("Invalid media key");
  }
  return normalized;
}

function localPublicUrl(config: Extract<MediaConfig, { driver: "local" }>, key: string) {
  const pathUrl = `/media/${key}`;
  return config.publicBaseUrl ? `${config.publicBaseUrl}${pathUrl}` : pathUrl;
}

function s3PublicUrl(config: Extract<MediaConfig, { driver: "s3" }>, key: string) {
  return `${config.publicUrl}/${key}`;
}

function createS3Client(config: Extract<MediaConfig, { driver: "s3" }>) {
  return new S3Client({
    region: config.region,
    endpoint: config.endpoint,
    forcePathStyle: config.forcePathStyle,
    credentials: {
      accessKeyId: config.accessKey,
      secretAccessKey: config.secretKey,
    },
  });
}

export async function putObject(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<StoredObject> {
  const safeKey = assertSafeKey(key);
  const config = getMediaConfig();

  if (config.driver === "local") {
    const absolute = path.join(config.uploadDir, safeKey);
    await mkdir(path.dirname(absolute), { recursive: true });
    await writeFile(absolute, body);
    return {
      key: safeKey,
      url: localPublicUrl(config, safeKey),
      contentType,
      size: body.byteLength,
    };
  }

  const client = createS3Client(config);
  await client.send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: safeKey,
      Body: body,
      ContentType: contentType,
    }),
  );

  return {
    key: safeKey,
    url: s3PublicUrl(config, safeKey),
    contentType,
    size: body.byteLength,
  };
}

export type MediaReadResult = {
  stream: Readable;
  contentType: string;
  size?: number;
};

export async function getObjectStream(key: string): Promise<MediaReadResult> {
  const safeKey = assertSafeKey(key);
  const config = getMediaConfig();

  if (config.driver === "local") {
    const absolute = path.join(config.uploadDir, safeKey);
    const resolvedUpload = path.resolve(config.uploadDir);
    const resolvedFile = path.resolve(absolute);
    if (
      !resolvedFile.startsWith(resolvedUpload + path.sep) &&
      resolvedFile !== resolvedUpload
    ) {
      throw new Error("Invalid media key");
    }
    if (!existsSync(resolvedFile)) {
      throw new Error("Not found");
    }
    return {
      stream: createReadStream(resolvedFile),
      contentType: guessContentType(safeKey),
    };
  }

  // S3 objects are normally served from S3_PUBLIC_URL; this path is a fallback.
  const client = createS3Client(config);
  const result = await client.send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: safeKey,
    }),
  );
  if (!result.Body) throw new Error("Not found");

  return {
    stream: result.Body as Readable,
    contentType: result.ContentType || guessContentType(safeKey),
    size: result.ContentLength,
  };
}

export async function deleteObject(key: string): Promise<void> {
  const safeKey = assertSafeKey(key);
  const config = getMediaConfig();

  if (config.driver === "local") {
    const absolute = path.join(config.uploadDir, safeKey);
    const resolvedUpload = path.resolve(config.uploadDir);
    const resolvedFile = path.resolve(absolute);
    if (
      !resolvedFile.startsWith(resolvedUpload + path.sep) &&
      resolvedFile !== resolvedUpload
    ) {
      throw new Error("Invalid media key");
    }
    if (existsSync(resolvedFile)) {
      await unlink(resolvedFile);
    }
    return;
  }

  const client = createS3Client(config);
  await client.send(
    new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: safeKey,
    }),
  );
}

function guessContentType(key: string): string {
  const ext = path.extname(key).toLowerCase();
  switch (ext) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".pdf":
      return "application/pdf";
    case ".txt":
      return "text/plain";
    case ".zip":
      return "application/zip";
    case ".doc":
      return "application/msword";
    case ".docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case ".xls":
      return "application/vnd.ms-excel";
    case ".xlsx":
      return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    case ".ppt":
      return "application/vnd.ms-powerpoint";
    case ".pptx":
      return "application/vnd.openxmlformats-officedocument.presentationml.presentation";
    default:
      return "application/octet-stream";
  }
}
