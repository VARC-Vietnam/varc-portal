import DOMPurify from "isomorphic-dompurify";

export function isEmptyHtml(html: string): boolean {
  const text = html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

/** Plain text from HTML, suitable for card excerpts. */
export function htmlToPlainText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** Truncate plain text for card previews. */
export function excerptFromHtml(html: string, maxLength = 160): string {
  const text = htmlToPlainText(html);
  if (!text) return "";
  if (text.length <= maxLength) return text;
  const sliced = text.slice(0, maxLength);
  const lastSpace = sliced.lastIndexOf(" ");
  const trimmed =
    lastSpace > Math.floor(maxLength * 0.6)
      ? sliced.slice(0, lastSpace)
      : sliced;
  return `${trimmed.trimEnd()}…`;
}

/** Convert legacy Markdown-ish plain text to a simple HTML paragraph if needed. */
export function normalizeEditorHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  const escaped = trimmed
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\n\n+/g, "</p><p>").replace(/\n/g, "<br>")}</p>`;
}

export function sanitizeHtml(html: string): string {
  return DOMPurify.sanitize(html, {
    USE_PROFILES: { html: true },
    ADD_ATTR: ["target", "rel", "class"],
    ADD_DATA_URI_TAGS: ["img"],
  });
}

/** First usable <img src> from HTML body content (for thumbnail fallbacks). */
export function extractFirstImageUrl(html: string): string {
  if (!html?.trim()) return "";

  const imgTag = html.match(/<img\b[^>]*>/i);
  if (!imgTag) return "";

  const srcMatch =
    imgTag[0].match(/\bsrc\s*=\s*"([^"]+)"/i) ||
    imgTag[0].match(/\bsrc\s*=\s*'([^']+)'/i) ||
    imgTag[0].match(/\bsrc\s*=\s*([^\s>]+)/i);

  const src = srcMatch?.[1]?.trim() ?? "";
  if (!src || src.startsWith("data:")) return "";
  return src;
}
