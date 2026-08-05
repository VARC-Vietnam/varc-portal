/** Portal / admin wall-clock timezone (Vietnam, UTC+7). */
export const PORTAL_TIMEZONE = "Asia/Ho_Chi_Minh";

function parseDate(value: string | Date): Date | null {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

function part(
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): string {
  return parts.find((item) => item.type === type)?.value ?? "";
}

/** Format a Date/ISO string for `<input type="datetime-local">` in UTC+7. */
export function toDatetimeLocalValue(
  value: string | Date | null | undefined,
): string {
  if (!value) return "";
  const date = parseDate(value);
  if (!date) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: PORTAL_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const year = part(parts, "year");
  const month = part(parts, "month");
  const day = part(parts, "day");
  const hour = part(parts, "hour");
  const minute = part(parts, "minute");
  if (!year || !month || !day || !hour || !minute) return "";
  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Parse a datetime-local value as UTC+7 wall time and return UTC ISO string.
 * Empty input → null.
 */
export function fromDatetimeLocalValue(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  // datetime-local is `YYYY-MM-DDTHH:mm` (optionally with seconds).
  const normalized =
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
      ? `${trimmed}:00+07:00`
      : /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(trimmed)
        ? `${trimmed}+07:00`
        : trimmed;

  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

/** Current instant as ISO (UTC). */
export function nowIso(): string {
  return new Date().toISOString();
}

export function formatDateTimeUtc7(
  value: string | Date | null | undefined,
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "";
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: PORTAL_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
    ...options,
  }).format(date);
}

export function formatDateUtc7(
  value: string | Date | null | undefined,
  locale: string = "vi-VN",
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return "";
  const date = parseDate(value);
  if (!date) return "";
  return new Intl.DateTimeFormat(locale, {
    timeZone: PORTAL_TIMEZONE,
    year: "numeric",
    month: "short",
    day: "numeric",
    ...options,
  }).format(date);
}

/** Ignore sub-minute skew so "now" / minute-rounded picks are not treated as scheduled. */
const SCHEDULE_GRACE_MS = 60_000;

/** True when publishedAt is clearly after `now` (UTC timeline). */
export function isFuturePublishAt(
  publishedAt: string | Date | null | undefined,
  now = new Date(),
): boolean {
  const date = publishedAt ? parseDate(publishedAt) : null;
  if (!date) return false;
  return date.getTime() > now.getTime() + SCHEDULE_GRACE_MS;
}

export function isScheduledPublish(
  status: string,
  publishedAt: string | Date | null | undefined,
  now = new Date(),
): boolean {
  if (status !== "published" || !publishedAt) return false;
  return isFuturePublishAt(publishedAt, now);
}
