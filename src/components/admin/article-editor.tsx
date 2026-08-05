"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteArticleAction, saveArticleAction } from "@/lib/actions";
import { isEmptyHtml } from "@/lib/html";
import { makeSlug } from "@/lib/slug";
import type { ArticleFormValues } from "@/lib/validations/article";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { ImageSourceField } from "@/components/admin/image-source-field";
import { CoverFocusPicker } from "@/components/admin/cover-focus-picker";
import { TagsInput } from "@/components/admin/tags-input";
import { useConfirm } from "@/components/admin/use-confirm";

type CategoryOption = { id: string; label: string };

type Props = {
  articleId?: string;
  initial: ArticleFormValues;
  categories: CategoryOption[];
};

type SectionId = "common" | "category" | "images" | "seo";

const SECTIONS: { id: SectionId; label: string }[] = [
  { id: "common", label: "Common" },
  { id: "category", label: "Category" },
  { id: "images", label: "Images" },
  { id: "seo", label: "SEO" },
];

const emptyLocale = {
  title: "",
  excerpt: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
};

export function ArticleEditor({ articleId, initial, categories }: Props) {
  const router = useRouter();
  const { ask, modal } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<ArticleFormValues>(initial);
  const [tab, setTab] = useState<"vi" | "en">("vi");
  const [section, setSection] = useState<SectionId>("common");

  const previewSlug = useMemo(
    () => (form.locales[tab].title ? makeSlug(form.locales[tab].title) : ""),
    [form.locales, tab],
  );

  const canPublish = useMemo(() => {
    return Boolean(
      form.locales.vi.title.trim() && !isEmptyHtml(form.locales.vi.content),
    );
  }, [form]);

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

  function toggleCategory(id: string) {
    setForm((prev) => {
      const has = prev.categoryIds.includes(id);
      return {
        ...prev,
        categoryIds: has
          ? prev.categoryIds.filter((value) => value !== id)
          : [...prev.categoryIds, id],
      };
    });
  }

  function onSave(status: "draft" | "published") {
    setError(null);
    startTransition(async () => {
      const result = await saveArticleAction(articleId ?? null, {
        ...form,
        status,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push(`/admin/articles/${result.id}`);
      router.refresh();
    });
  }

  async function onDelete() {
    if (!articleId) return;
    const confirmed = await ask({
      title: "Move to trash",
      message: "Move this article to trash?",
      confirmLabel: "Move to trash",
      variant: "danger",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteArticleAction(articleId);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.push("/admin/articles");
      router.refresh();
    });
  }

  const locale = form.locales[tab];
  const sectionIndex = SECTIONS.findIndex((item) => item.id === section);
  const sectionMeta = SECTIONS[sectionIndex];

  const sectionNav = (
    <div className="absolute top-6 bottom-0 left-full z-20">
      <nav
        aria-label="Article sections"
        className="sticky top-28 -ml-px flex w-[5.75rem] flex-col"
      >
        {SECTIONS.map((item) => {
          const active = section === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setSection(item.id)}
              aria-current={active ? "page" : undefined}
              className={`border border-l-0 px-3 py-2.5 text-left text-xs font-semibold tracking-wide transition-colors ${
                active
                  ? "rounded-r-md border-gray-900 bg-gray-900 text-white shadow-sm"
                  : "rounded-r-md border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              } ${item.id !== SECTIONS[0].id ? "-mt-px" : ""}`}
            >
              {item.label}
            </button>
          );
        })}
      </nav>
    </div>
  );

  return (
    <>
    <div>
      {error ? (
        <p className="mb-6 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
            Section {sectionIndex + 1} of {SECTIONS.length}
          </p>
          <h2 className="text-lg font-semibold text-gray-900">
            {sectionMeta.label}
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-disabled={sectionIndex === 0}
            onClick={() => {
              if (sectionIndex === 0) return;
              setSection(SECTIONS[sectionIndex - 1].id);
            }}
            className={`rounded border border-gray-300 bg-white px-3 py-1.5 text-sm ${
              sectionIndex === 0
                ? "pointer-events-none opacity-40"
                : "hover:bg-gray-50"
            }`}
          >
            Previous
          </button>
          <button
            type="button"
            aria-disabled={sectionIndex === SECTIONS.length - 1}
            onClick={() => {
              if (sectionIndex === SECTIONS.length - 1) return;
              setSection(SECTIONS[sectionIndex + 1].id);
            }}
            className={`rounded border border-gray-300 bg-white px-3 py-1.5 text-sm ${
              sectionIndex === SECTIONS.length - 1
                ? "pointer-events-none opacity-40"
                : "hover:bg-gray-50"
            }`}
          >
            Next
          </button>
        </div>
      </div>

      <div className="relative w-full max-md:pr-[5.75rem]">
        <div className="w-full">
          {section === "common" ? (
            <div className="grid content-start gap-4 rounded-lg border border-gray-200 bg-white p-5 min-h-[33dvh]">
              <label className="flex cursor-pointer items-start gap-3 rounded-md border border-gray-200 bg-gray-50 px-3 py-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-0.5"
                  checked={form.featured}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      featured: e.target.checked,
                    }))
                  }
                />
                <span>
                  <span className="block font-medium text-gray-900">
                    Featured on home
                  </span>
                  <span className="mt-0.5 block text-xs text-gray-500">
                    Pin this article in the home page spotlight (up to three
                    featured posts).
                  </span>
                </span>
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab("vi")}
                  className={`rounded px-3 py-1.5 text-sm ${tab === "vi" ? "bg-gray-900 text-white" : "border border-gray-300 bg-white"}`}
                >
                  Vietnamese
                </button>
                <button
                  type="button"
                  onClick={() => setTab("en")}
                  className={`rounded px-3 py-1.5 text-sm ${tab === "en" ? "bg-gray-900 text-white" : "border border-gray-300 bg-white"}`}
                >
                  English
                </button>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Title ({tab.toUpperCase()})
                </span>
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
                <p className="mt-1 text-xs text-gray-500">
                  Generated from the title when you save. Conflicts get a
                  numeric suffix.
                </p>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">Excerpt</span>
                <textarea
                  value={locale.excerpt}
                  onChange={(e) =>
                    updateLocale(tab, "excerpt", e.target.value)
                  }
                  rows={2}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </label>
              <div className="block text-sm">
                <span className="mb-1 block font-medium">Content</span>
                <RichTextEditor
                  key={tab}
                  value={locale.content}
                  onChange={(html) => updateLocale(tab, "content", html)}
                  placeholder={
                    tab === "vi" ? "Nội dung bài viết…" : "Article content…"
                  }
                />
              </div>
            </div>
          ) : null}

          {section === "category" ? (
            <div className="grid content-start gap-6 rounded-lg border border-gray-200 bg-white p-5 min-h-[33dvh]">
              <div>
                <p className="mb-1 text-sm font-medium text-gray-900">
                  Categories
                </p>
                <p className="mb-3 text-sm text-gray-600">
                  Choose one or more categories for this article.
                </p>
                {categories.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No categories yet. Create some under Categories.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-3">
                    {categories.map((category) => (
                      <label
                        key={category.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors ${
                          form.categoryIds.includes(category.id)
                            ? "border-gray-900 bg-gray-900 text-white"
                            : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={form.categoryIds.includes(category.id)}
                          onChange={() => toggleCategory(category.id)}
                        />
                        {category.label}
                      </label>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1 text-sm font-medium text-gray-900">Tags</p>
                <p className="mb-3 text-sm text-gray-600">
                  Freeform labels for filtering and discovery.
                </p>
                <TagsInput
                  value={form.tags}
                  onChange={(tags) => setForm((prev) => ({ ...prev, tags }))}
                />
              </div>
            </div>
          ) : null}

          {section === "images" ? (
            <div className="grid content-start gap-5 rounded-lg border border-gray-200 bg-white p-5 min-h-[33dvh]">
              <ImageSourceField
                label="Cover image"
                description="Shown in the home hero, cards, and at the top of the article."
                value={form.coverImageUrl}
                onChange={(coverImageUrl) =>
                  setForm((prev) => ({ ...prev, coverImageUrl }))
                }
              />
              {form.coverImageUrl ? (
                <CoverFocusPicker
                  imageUrl={form.coverImageUrl}
                  value={form.coverImageFocus}
                  onChange={(coverImageFocus) =>
                    setForm((prev) => ({ ...prev, coverImageFocus }))
                  }
                />
              ) : null}
              <ImageSourceField
                label="OG image"
                description="Used for link previews on social platforms. Leave empty to fall back to the cover."
                value={form.ogImageUrl}
                onChange={(ogImageUrl) =>
                  setForm((prev) => ({ ...prev, ogImageUrl }))
                }
              />
              {form.coverImageUrl && !form.ogImageUrl ? (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      ogImageUrl: prev.coverImageUrl,
                    }))
                  }
                  className="justify-self-start text-sm text-gray-700 underline-offset-2 hover:underline"
                >
                  Copy cover image to OG image
                </button>
              ) : null}
            </div>
          ) : null}

          {section === "seo" ? (
            <div className="grid content-start gap-4 rounded-lg border border-gray-200 bg-white p-5 min-h-[33dvh]">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab("vi")}
                  className={`rounded px-3 py-1.5 text-sm ${tab === "vi" ? "bg-gray-900 text-white" : "border border-gray-300 bg-white"}`}
                >
                  Vietnamese
                </button>
                <button
                  type="button"
                  onClick={() => setTab("en")}
                  className={`rounded px-3 py-1.5 text-sm ${tab === "en" ? "bg-gray-900 text-white" : "border border-gray-300 bg-white"}`}
                >
                  English
                </button>
              </div>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Meta title ({tab.toUpperCase()})
                </span>
                <input
                  value={locale.metaTitle}
                  onChange={(e) =>
                    updateLocale(tab, "metaTitle", e.target.value)
                  }
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium">
                  Meta description ({tab.toUpperCase()})
                </span>
                <textarea
                  value={locale.metaDescription}
                  onChange={(e) =>
                    updateLocale(tab, "metaDescription", e.target.value)
                  }
                  rows={3}
                  className="w-full rounded border border-gray-300 px-3 py-2"
                />
              </label>
            </div>
          ) : null}
        </div>

        {sectionNav}
      </div>

      <div className="sticky bottom-0 z-20 mt-6 flex flex-wrap items-center gap-3 border-t border-gray-200 bg-[var(--admin-bg)] py-4">
        <button
          type="button"
          disabled={pending || undefined}
          onClick={() => onSave("draft")}
          className="rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Save draft
        </button>
        <button
          type="button"
          disabled={pending || !canPublish || undefined}
          onClick={() => onSave("published")}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          Publish
        </button>
        {articleId ? (
          <button
            type="button"
            disabled={pending || undefined}
            onClick={onDelete}
            className="ml-auto rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            Move to trash
          </button>
        ) : null}
      </div>
    </div>
    {modal}
    </>
  );
}

export const emptyArticleForm: ArticleFormValues = {
  status: "draft",
  featured: false,
  coverImageUrl: "",
  coverImageFocus: { x: 15, y: 15, width: 70, height: 70 },
  ogImageUrl: "",
  categoryIds: [],
  tags: [],
  locales: {
    vi: { ...emptyLocale },
    en: { ...emptyLocale },
  },
};
