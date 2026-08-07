"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cloneArticleAction, deleteArticleAction, saveArticleAction } from "@/lib/actions";
import { isEmptyHtml } from "@/lib/html";
import { makeSlug } from "@/lib/slug";
import type { ArticleFormValues } from "@/lib/validations/article";
import { RichTextEditor } from "@/components/admin/rich-text-editor";
import { ImageSourceField } from "@/components/admin/image-source-field";
import { CoverFocusPicker } from "@/components/admin/cover-focus-picker";
import { TagsInput } from "@/components/admin/tags-input";
import { CategoryCheckboxDropdown } from "@/components/admin/category-checkbox-dropdown";
import { AdminCheckbox } from "@/components/admin/admin-checkbox";
import {
  CloneIcon,
  ExternalLinkIcon,
  PublishIcon,
  SaveDraftIcon,
  TrashIcon,
} from "@/components/admin/admin-action-icons";
import { IconActionButton } from "@/components/admin/icon-action-button";
import { useConfirm } from "@/components/admin/use-confirm";
import { notifyAction } from "@/components/admin/admin-toast";
import {
  ARTICLE_ASIDE_PAD_COLLAPSED,
  ARTICLE_ASIDE_PAD_EXPANDED,
  ArticleSectionAside,
  useArticleSectionAsideExpanded,
  type ArticleSideSectionId,
} from "@/components/admin/article-section-aside";
import {
  fromDatetimeLocalValue,
  isFuturePublishAt,
  isScheduledPublish,
  nowIso,
  toDatetimeLocalValue,
} from "@/lib/datetime-local";

type CategoryOption = { id: string; label: string; depth?: number };

type Props = {
  articleId?: string;
  heading: string;
  initial: ArticleFormValues;
  categories: CategoryOption[];
};

const emptyLocale = {
  title: "",
  excerpt: "",
  content: "",
  metaTitle: "",
  metaDescription: "",
};

type PublishFieldErrors = {
  title?: string;
  content?: string;
};

export function ArticleEditor({
  articleId,
  heading,
  initial,
  categories,
}: Props) {
  const router = useRouter();
  const { ask, modal } = useConfirm();
  const [now, setNow] = useState(() => new Date());
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<PublishFieldErrors>({});
  const [form, setForm] = useState<ArticleFormValues>(initial);
  const [tab, setTab] = useState<"vi" | "en">("vi");
  const [sideSection, setSideSection] =
    useState<ArticleSideSectionId | null>("category");
  const asideExpanded = useArticleSectionAsideExpanded();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const contentFieldRef = useRef<HTMLDivElement>(null);

  const publishedIsScheduled = isFuturePublishAt(form.publishedAt, now);

  const previewSlug = useMemo(
    () => (form.locales[tab].title ? makeSlug(form.locales[tab].title) : ""),
    [form.locales, tab],
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
    if (locale === "vi" && (field === "title" || field === "content")) {
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  }

  function setCategories(categoryIds: string[]) {
    setForm((prev) => ({ ...prev, categoryIds }));
  }

  function validatePublish(): PublishFieldErrors {
    const next: PublishFieldErrors = {};
    if (!form.locales.vi.title.trim()) {
      next.title = "Vietnamese title is required to publish";
    }
    if (isEmptyHtml(form.locales.vi.content)) {
      next.content = "Vietnamese content is required to publish";
    }
    return next;
  }

  function onSave(status: "draft" | "published") {
    setError(null);

    if (status === "published") {
      const nextErrors = validatePublish();
      if (nextErrors.title || nextErrors.content) {
        setFieldErrors(nextErrors);
        setTab("vi");
        setError("Fill in the required Vietnamese fields before publishing.");
        queueMicrotask(() => {
          if (nextErrors.title) {
            titleInputRef.current?.focus();
            titleInputRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          } else {
            contentFieldRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }
        });
        return;
      }
      setFieldErrors({});
    }

    startTransition(async () => {
      const nextPublishedAt =
        status === "published"
          ? form.publishedAt ?? nowIso()
          : form.publishedAt;
      const result = await saveArticleAction(articleId ?? null, {
        ...form,
        status,
        publishedAt: nextPublishedAt,
      });
      const scheduled = isScheduledPublish(status, nextPublishedAt);
      if (
        !notifyAction(
          result,
          status === "published"
            ? scheduled
              ? "Article scheduled"
              : "Article published"
            : "Article saved",
        )
      ) {
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
      if (!notifyAction(result, "Moved to trash")) {
        setError(result.error);
        return;
      }
      router.push("/admin/articles");
      router.refresh();
    });
  }

  function onClone() {
    if (!articleId) return;
    setError(null);
    startTransition(async () => {
      const result = await cloneArticleAction(articleId);
      if (!notifyAction(result, "Article cloned as draft")) {
        setError(result.error);
        return;
      }
      router.push(`/admin/articles/${result.id}`);
      router.refresh();
    });
  }

  const locale = form.locales[tab];

  const sidePanels = {
    category: (
      <div className="grid min-w-0 content-start gap-5">
        <label className="flex min-w-0 cursor-pointer items-start gap-3 rounded-md border border-gray-200 bg-white px-3 py-3 text-sm">
          <AdminCheckbox
            className="mt-0.5"
            checked={form.featured}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                featured: e.target.checked,
              }))
            }
          />
          <span className="min-w-0">
            <span className="block font-medium text-gray-900">
              Featured on home
            </span>
            <span className="mt-0.5 block text-xs text-gray-500">
              The three newest featured posts appear in the home hero slideshow.
              Older featured posts still show in the sections below.
            </span>
          </span>
        </label>

        <div className="min-w-0">
          <p className="mb-1 text-sm font-medium text-gray-900">Categories</p>
          <p className="mb-3 text-xs text-gray-600">
            Choose one or more categories for this article.
          </p>
          <CategoryCheckboxDropdown
            options={categories}
            value={form.categoryIds}
            onChange={setCategories}
            emptyLabel="No categories yet. Create some under Categories."
          />
        </div>

        <div className="min-w-0">
          <p className="mb-1 text-sm font-medium text-gray-900">Tags</p>
          <p className="mb-3 text-xs text-gray-600">
            Freeform labels for filtering and discovery.
          </p>
          <TagsInput
            value={form.tags}
            onChange={(tags) => setForm((prev) => ({ ...prev, tags }))}
          />
        </div>
      </div>
    ),
    images: (
      <div className="grid min-w-0 content-start gap-4">
        <ImageSourceField
          compact
          label="Cover image"
          description="Home hero, cards, and article top."
          value={form.coverImageUrl}
          onChange={(coverImageUrl) =>
            setForm((prev) => ({ ...prev, coverImageUrl }))
          }
        />
        {form.coverImageUrl ? (
          <CoverFocusPicker
            compact
            imageUrl={form.coverImageUrl}
            value={form.coverImageFocus}
            onChange={(coverImageFocus) =>
              setForm((prev) => ({ ...prev, coverImageFocus }))
            }
          />
        ) : null}
        <ImageSourceField
          compact
          label="OG image"
          description="Social link previews. Empty falls back to cover."
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
            className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
          >
            Copy cover to OG image
          </button>
        ) : null}
      </div>
    ),
    seo: (
      <div className="grid min-w-0 content-start gap-4">
        <div className="inline-flex w-full rounded-md border border-gray-300 bg-white p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setTab("vi")}
            className={`flex-1 rounded px-2.5 py-1.5 font-medium transition-colors ${
              tab === "vi"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            VI
          </button>
          <button
            type="button"
            onClick={() => setTab("en")}
            className={`flex-1 rounded px-2.5 py-1.5 font-medium transition-colors ${
              tab === "en"
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            EN
          </button>
        </div>
        <label className="block min-w-0 text-sm">
          <span className="mb-1 block font-medium">
            Meta title ({tab.toUpperCase()})
          </span>
          <input
            value={locale.metaTitle}
            onChange={(e) => updateLocale(tab, "metaTitle", e.target.value)}
            className="w-full min-w-0 rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block min-w-0 text-sm">
          <span className="mb-1 block font-medium">
            Meta description ({tab.toUpperCase()})
          </span>
          <textarea
            value={locale.metaDescription}
            onChange={(e) =>
              updateLocale(tab, "metaDescription", e.target.value)
            }
            rows={4}
            className="w-full min-w-0 resize-y rounded border border-gray-300 px-3 py-2"
          />
        </label>
      </div>
    ),
    datetime: (
      <div className="grid min-w-0 content-start gap-4">
        <p className="text-xs text-gray-500">
          Times use UTC+7 (Vietnam). Leave Published date empty to set it
          automatically when you click Publish. A future date keeps the article
          hidden until that time.
        </p>
        <label className="block min-w-0 text-sm">
          <span className="mb-1 block font-medium">Published date (UTC+7)</span>
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(form.publishedAt)}
            onChange={(e) => {
              const instant = new Date();
              setNow(instant);
              setForm((prev) => ({
                ...prev,
                publishedAt: fromDatetimeLocalValue(e.target.value),
              }));
            }}
            className="w-full min-w-0 rounded border border-gray-300 bg-white px-3 py-2"
          />
          {publishedIsScheduled ? (
            <span className="mt-1 block text-xs text-amber-700">
              Scheduled — not visible until this time (UTC+7).
            </span>
          ) : null}
        </label>
        <label className="block min-w-0 text-sm">
          <span className="mb-1 block font-medium">Created date (UTC+7)</span>
          <input
            type="datetime-local"
            value={toDatetimeLocalValue(form.createdAt)}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                createdAt: fromDatetimeLocalValue(e.target.value),
              }))
            }
            className="w-full min-w-0 rounded border border-gray-300 bg-white px-3 py-2"
          />
          <span className="mt-1 block text-xs text-gray-500">
            Optional. Leave empty on new articles to use the save time.
          </span>
        </label>
        <button
          type="button"
          onClick={() => {
            const instant = new Date();
            setNow(instant);
            setForm((prev) => ({
              ...prev,
              publishedAt: instant.toISOString(),
            }));
          }}
          className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-left text-sm text-gray-800 hover:bg-gray-50"
        >
          Set published date to now (UTC+7)
        </button>
      </div>
    ),
  };

  return (
    <>
      <div
        className={`w-full min-w-0 transition-[padding] duration-200 ease-out ${
          asideExpanded
            ? ARTICLE_ASIDE_PAD_EXPANDED
            : ARTICLE_ASIDE_PAD_COLLAPSED
        }`}
      >
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <h1 className="text-2xl font-semibold">{heading}</h1>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {articleId ? (
                <a
                  href={`/${tab}/news/preview/${articleId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mr-1 inline-flex items-center gap-1.5 text-sm text-gray-700 underline-offset-2 hover:text-gray-900 hover:underline"
                  title="Opens the last saved version in a new tab"
                >
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                  Preview
                </a>
              ) : (
                <span
                  className="mr-1 inline-flex items-center gap-1.5 text-sm text-gray-400"
                  title="Save the article first to preview"
                >
                  <ExternalLinkIcon className="h-3.5 w-3.5" />
                  Preview
                </span>
              )}
              <button
                type="button"
                disabled={pending || undefined}
                onClick={() => onSave("draft")}
                className="inline-flex items-center gap-2 rounded border border-gray-300 bg-white px-4 py-2 text-sm hover:bg-gray-50 disabled:opacity-50"
              >
                <SaveDraftIcon />
                Save draft
              </button>
              <button
                type="button"
                disabled={pending || undefined}
                onClick={() => onSave("published")}
                className="inline-flex items-center gap-2 rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
              >
                <PublishIcon />
                Publish
              </button>
              {articleId ? (
                <>
                  <IconActionButton
                    label="Clone as draft"
                    disabled={pending}
                    onClick={onClone}
                  >
                    <CloneIcon />
                  </IconActionButton>
                  <IconActionButton
                    label="Move to trash"
                    variant="danger"
                    disabled={pending}
                    onClick={onDelete}
                  >
                    <TrashIcon />
                  </IconActionButton>
                </>
              ) : null}
            </div>
          </div>

          {error ? (
            <p className="mb-6 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          ) : null}

          <div className="min-w-0">
            <div className="grid content-start gap-4 rounded-lg border border-gray-200 bg-white p-5">
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setTab("vi")}
                  className={`rounded px-3 py-1.5 text-sm ${
                    tab === "vi"
                      ? "bg-gray-900 text-white"
                      : fieldErrors.title || fieldErrors.content
                        ? "border border-red-400 bg-red-50 text-red-800"
                        : "border border-gray-300 bg-white"
                  }`}
                >
                  Vietnamese
                  {fieldErrors.title || fieldErrors.content ? (
                    <span className="ml-1 text-red-500" aria-hidden>
                      *
                    </span>
                  ) : null}
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
                  {tab === "vi" ? (
                    <span className="ml-1 text-red-600" aria-hidden>
                      *
                    </span>
                  ) : null}
                </span>
                <input
                  ref={tab === "vi" ? titleInputRef : undefined}
                  value={locale.title}
                  onChange={(e) => updateLocale(tab, "title", e.target.value)}
                  aria-invalid={tab === "vi" && Boolean(fieldErrors.title)}
                  className={`w-full rounded border px-3 py-2 ${
                    tab === "vi" && fieldErrors.title
                      ? "border-red-500 bg-red-50 outline-none ring-2 ring-red-200"
                      : "border-gray-300"
                  }`}
                />
                {tab === "vi" && fieldErrors.title ? (
                  <p className="mt-1 text-xs text-red-600">{fieldErrors.title}</p>
                ) : null}
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
              <div className="block text-sm" ref={contentFieldRef}>
                <span className="mb-1 block font-medium">
                  Content
                  {tab === "vi" ? (
                    <span className="ml-1 text-red-600" aria-hidden>
                      *
                    </span>
                  ) : null}
                </span>
                <div
                  aria-invalid={tab === "vi" && Boolean(fieldErrors.content)}
                  className={
                    tab === "vi" && fieldErrors.content
                      ? "rounded-md ring-2 ring-red-500 ring-offset-2"
                      : undefined
                  }
                >
                  <RichTextEditor
                    key={tab}
                    value={locale.content}
                    onChange={(html) => updateLocale(tab, "content", html)}
                    imageAltFallback={locale.title}
                    placeholder={
                      tab === "vi" ? "Nội dung bài viết…" : "Article content…"
                    }
                  />
                </div>
                {tab === "vi" && fieldErrors.content ? (
                  <p className="mt-1 text-xs text-red-600">
                    {fieldErrors.content}
                  </p>
                ) : null}
              </div>
            </div>
          </div>
      </div>

      <ArticleSectionAside
        openSection={sideSection}
        onOpenSectionChange={setSideSection}
        panels={sidePanels}
      />
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
  publishedAt: null,
  createdAt: null,
  locales: {
    vi: { ...emptyLocale },
    en: { ...emptyLocale },
  },
};
