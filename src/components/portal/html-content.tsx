import {
  normalizeEditorHtml,
  sanitizeHtml,
} from "@/lib/html";

export function HtmlContent({
  html,
  className = "prose-article-wide mt-10",
}: {
  html: string;
  className?: string;
}) {
  const safe = sanitizeHtml(normalizeEditorHtml(html));
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: safe }}
    />
  );
}
