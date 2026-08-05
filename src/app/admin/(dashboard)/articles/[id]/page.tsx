import { notFound } from "next/navigation";
import {
  ArticleEditor,
  emptyArticleForm,
} from "@/components/admin/article-editor";
import { getArticleById, getLocaleContent } from "@/lib/articles";
import { listCategories, getCategoryLocale } from "@/lib/cms";
import { normalizeEditorHtml } from "@/lib/html";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditArticlePage({ params }: Props) {
  const { id } = await params;
  const [article, categories] = await Promise.all([
    getArticleById(id),
    listCategories(),
  ]);
  if (!article) notFound();

  const vi = getLocaleContent(article, "vi");
  const en = getLocaleContent(article, "en");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit article</h1>
      <ArticleEditor
        articleId={id}
        categories={categories.map((category) => ({
          id: String(category._id),
          label:
            getCategoryLocale(category, "vi").name ||
            getCategoryLocale(category, "en").name ||
            String(category._id),
        }))}
        initial={{
          ...emptyArticleForm,
          status: article.status === "published" ? "published" : "draft",
          featured: Boolean(article.featured),
          coverImageUrl: article.coverImageUrl ?? "",
          ogImageUrl: article.ogImageUrl ?? "",
          categoryIds: (article.categoryIds ?? []).map(String),
          tags: (article.tags ?? []).map(String),
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
    </div>
  );
}
