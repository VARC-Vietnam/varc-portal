"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { deletePageAction, savePageAction } from "@/lib/actions";
import { isEmptyHtml } from "@/lib/html";
import { makeSlug } from "@/lib/slug";
import type { PageFormValues } from "@/lib/validations/article";
import type { TemplateLayout } from "@/lib/blocks/types";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { PageGalleryField } from "@/components/admin/page-gallery-field";
import { TemplateLayoutBuilder } from "@/components/admin/template-builder/template-layout-builder";
import { useConfirm } from "@/components/admin/use-confirm";
import { notifyAction } from "@/components/admin/admin-toast";

type TemplateOption = {
  key: string;
  name: string;
  description: string;
};

type Option = { id: string; label: string };

type Props = {
  pageId?: string;
  initial: PageFormValues;
  templates: TemplateOption[];
  defaultLayouts: Record<string, TemplateLayout>;
  articleOptions?: Option[];
  categoryOptions?: Option[];
};

const emptyLocale = {
  title: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
};

export function PageEditor({
  pageId,
  initial,
  templates,
  defaultLayouts,
  articleOptions = [],
  categoryOptions = [],
}: Props) {
  const router = useRouter();
  const { ask, modal } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState<"vi" | "en">("vi");
  const customize = form.layoutOverride != null;

  const previewSlug = useMemo(
    () => (form.locales[tab].title ? makeSlug(form.locales[tab].title) : ""),
    [form.locales, tab],
  );

  const isGallery = form.templateKey === "gallery";
  const selectedTemplate = templates.find((t) => t.key === form.templateKey);

  const canPublish = Boolean(
    form.locales.vi.title.trim() &&
      (isGallery
        ? form.galleryItems.length > 0
        : form.templateKey === "blank" ||
            form.templateKey === "home" ||
            form.templateKey === "category" ||
            !isEmptyHtml(form.locales.vi.content)),
  );

  function updateLocale(
    locale: "vi" | "en",
    field: keyof typeof emptyLocale,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      locales: {
        ...prev.locales,
        [locale]: { ...prev.locales[locale], [field]: value },
      },
    }));
  }

  function onSave(status: "draft" | "published") {
    setError(null);
    startTransition(async () => {
      const result = await savePageAction(pageId ?? null, { ...form, status });
      if (!notifyAction(result, status === "published" ? "Page published" : "Page saved")) {
        setError(result.error);
        return;
      }
      router.push(`/admin/pages/${result.id}`);
      router.refresh();
    });
  }

  async function onDelete() {
    if (!pageId) return;
    const confirmed = await ask({
      title: "Move to trash",
      message: "Move this page to trash?",
      confirmLabel: "Move to trash",
      variant: "danger",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deletePageAction(pageId);
      if (!notifyAction(result, "Moved to trash")) {
        setError(result.error);
        return;
      }
      router.push("/admin/pages");
      router.refresh();
    });
  }

  const locale = form.locales[tab];

  return (
    <>
    <div className="space-y-6">
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTab("vi")}
            className={`rounded px-3 py-1.5 text-sm ${tab === "vi" ? "bg-gray-900 text-white" : "border border-gray-300"}`}
          >
            Vietnamese
          </button>
          <button
            type="button"
            onClick={() => setTab("en")}
            className={`rounded px-3 py-1.5 text-sm ${tab === "en" ? "bg-gray-900 text-white" : "border border-gray-300"}`}
          >
            English
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <button
            type="button"
            disabled={pending}
            onClick={() => onSave("draft")}
            className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
          >
            Save draft
          </button>
          <button
            type="button"
            disabled={pending || !canPublish}
            onClick={() => onSave("published")}
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            Publish
          </button>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Template</span>
          <select
            value={form.templateKey}
            onChange={(e) => {
              const templateKey = e.target.value;
              setForm((prev) => ({
                ...prev,
                templateKey,
                layoutOverride: prev.layoutOverride
                  ? structuredClone(
                      defaultLayouts[templateKey] ?? prev.layoutOverride,
                    )
                  : null,
              }));
            }}
            className="w-full rounded border border-gray-300 px-3 py-2 md:max-w-md"
          >
            {templates.map((template) => (
              <option key={template.key} value={template.key}>
                {template.name}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-gray-500">
            {selectedTemplate?.description ||
              (isGallery
                ? "Gallery pages show a large selected image with a thumbnail strip."
                : "Choose a layout template for this page.")}{" "}
            <Link href="/admin/templates" className="underline">
              Manage templates
            </Link>
          </p>
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={customize}
            onChange={(e) => {
              if (e.target.checked) {
                const base =
                  (form.layoutOverride as TemplateLayout | null) ??
                  defaultLayouts[form.templateKey] ?? { sections: [] };
                setForm((prev) => ({
                  ...prev,
                  layoutOverride: structuredClone(base),
                }));
              } else {
                setForm((prev) => ({ ...prev, layoutOverride: null }));
              }
            }}
          />
          Customize layout for this page
        </label>

        {customize && form.layoutOverride ? (
          <TemplateLayoutBuilder
            layout={form.layoutOverride as TemplateLayout}
            onChange={(layoutOverride) =>
              setForm((prev) => ({ ...prev, layoutOverride }))
            }
            articleOptions={articleOptions}
            categoryOptions={categoryOptions}
          />
        ) : null}

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Title ({tab.toUpperCase()})</span>
          <input
            value={locale.title}
            onChange={(e) => updateLocale(tab, "title", e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <div className="text-sm">
          <span className="mb-1 block font-medium">Slug (auto)</span>
          <p className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 font-mono text-gray-600">
            {previewSlug || "—"}
          </p>
        </div>

        {isGallery ? (
          <PageGalleryField
            items={form.galleryItems}
            onChange={(galleryItems) =>
              setForm((prev) => ({ ...prev, galleryItems }))
            }
          />
        ) : null}

        <div className="block text-sm">
          <span className="mb-1 block font-medium">
            {isGallery ? "Intro content (optional)" : "Content"}
          </span>
          <RichTextEditor
            key={`${tab}-${form.templateKey}`}
            value={locale.content}
            onChange={(html) => updateLocale(tab, "content", html)}
            placeholder={
              isGallery
                ? tab === "vi"
                  ? "Mô tả ngắn phía trên gallery…"
                  : "Optional intro above the gallery…"
                : tab === "vi"
                  ? "Nội dung trang…"
                  : "Page content…"
            }
          />
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Meta title</span>
            <input
              value={locale.metaTitle}
              onChange={(e) => updateLocale(tab, "metaTitle", e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Meta description</span>
            <input
              value={locale.metaDescription}
              onChange={(e) =>
                updateLocale(tab, "metaDescription", e.target.value)
              }
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 md:grid-cols-2">
        <div className="space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.showInNav}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, showInNav: e.target.checked }))
              }
            />
            Legacy: include in navigation import
          </label>
          <p className="text-gray-500">
            Prefer{" "}
            <Link href="/admin/menu" className="underline">
              Menus
            </Link>{" "}
            to manage Navigation and Footer order.
          </p>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Sort order</span>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                sortOrder: Number(e.target.value) || 0,
              }))
            }
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
      </div>

      {pageId ? (
        <div className="flex justify-end">
          <button
            type="button"
            disabled={pending}
            onClick={onDelete}
            className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Move to trash
          </button>
        </div>
      ) : null}
    </div>
    {modal}
    </>
  );
}

export const emptyPageForm: PageFormValues = {
  status: "draft",
  templateKey: "custom",
  layoutOverride: null,
  galleryItems: [],
  showInNav: false,
  sortOrder: 0,
  locales: {
    vi: { ...emptyLocale },
    en: { ...emptyLocale },
  },
};
