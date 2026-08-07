import { notFound } from "next/navigation";
import {
  ArticleEditor,
  emptyArticleForm,
} from "@/components/admin/article-editor";
import { requireEditorialPage } from "@/lib/admin-access";
import { getArticleById, getLocaleContent } from "@/lib/articles";
import { listCategories, categorySelectOptions } from "@/lib/cms";
import { normalizeEditorHtml } from "@/lib/html";
import { normalizeCoverFocus } from "@/lib/cover-focus";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditArticlePage({ params }: Props) {
  await requireEditorialPage();

  const { id } = await params;
  const [article, categories] = await Promise.all([
    getArticleById(id),
    listCategories(),
  ]);
  if (!article || article.deletedAt) notFound();

  const vi = getLocaleContent(article, "vi");
  const en = getLocaleContent(article, "en");

  return (
    <ArticleEditor
      articleId={id}
      heading="Edit article"
      categories={categorySelectOptions(categories, "vi")}
      initial={{
        ...emptyArticleForm,
        status: article.status === "published" ? "published" : "draft",
        featured: Boolean(article.featured),
        coverImageUrl: article.coverImageUrl ?? "",
        coverImageFocus: normalizeCoverFocus(article.coverImageFocus),
        ogImageUrl: article.ogImageUrl ?? "",
        categoryIds: (article.categoryIds ?? []).map(String),
        tags: (article.tags ?? []).map(String),
        publishedAt: article.publishedAt
          ? new Date(article.publishedAt).toISOString()
          : null,
        createdAt: article.createdAt
          ? new Date(article.createdAt).toISOString()
          : null,
        locales: {
          vi: {
            title: vi.title,
            excerpt: vi.excerpt,
            content: normalizeEditorHtml(vi.content),
            metaTitle: vi.metaTitle,
            metaDescription: vi.metaDescription,
          },
          en: {
            title: en.title,
            excerpt: en.excerpt,
            content: normalizeEditorHtml(en.content),
            metaTitle: en.metaTitle,
            metaDescription: en.metaDescription,
          },
        },
      }}
    />
  );
}
