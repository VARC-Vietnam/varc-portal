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
    ADD_ATTR: ["target", "rel", "class", "data-size", "width", "height"],
    FORBID_TAGS: ["script", "iframe", "object", "embed", "form", "input"],
    ALLOW_UNKNOWN_PROTOCOLS: false,
    ALLOWED_URI_REGEXP:
      /^(?:(?:(?:f|ht)tps?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
  });
}

/** First usable <img src> from HTML body content (for thumbnail fallbacks). */
export function extractFirstImageUrl(html: string): string {
  const images = extractContentImages(html);
  return images[0]?.url ?? "";
}

export type ContentImage = {
  id: string;
  url: string;
  alt: string;
};

/** Collect unique image URLs (http(s) or site-relative) from HTML, in document order. */
export function extractContentImages(html: string): ContentImage[] {
  if (!html?.trim()) return [];

  const images: ContentImage[] = [];
  const seen = new Set<string>();
  const imgTagRe = /<img\b[^>]*>/gi;
  let match: RegExpExecArray | null;

  while ((match = imgTagRe.exec(html)) !== null) {
    const tag = match[0];
    const srcMatch =
      tag.match(/\bsrc\s*=\s*"([^"]+)"/i) ||
      tag.match(/\bsrc\s*=\s*'([^']+)'/i) ||
      tag.match(/\bsrc\s*=\s*([^\s>]+)/i);
    const altMatch =
      tag.match(/\balt\s*=\s*"([^"]*)"/i) ||
      tag.match(/\balt\s*=\s*'([^']*)'/i);

    const url = (srcMatch?.[1] ?? "").trim();
    if (!url || url.startsWith("data:") || seen.has(url)) continue;
    if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) continue;

    seen.add(url);
    images.push({
      id: `img-${images.length}`,
      url,
      alt: (altMatch?.[1] ?? "").trim(),
    });
  }

  return images;
}
