import {
  ArticleEditor,
  emptyArticleForm,
} from "@/components/admin/article-editor";
import { listCategories, getCategoryLocale } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  const categories = await listCategories();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New article</h1>
      <ArticleEditor
        initial={emptyArticleForm}
        categories={categories.map((category) => ({
          id: String(category._id),
          label:
            getCategoryLocale(category, "vi").name ||
            getCategoryLocale(category, "en").name ||
            String(category._id),
        }))}
      />
    </div>
  );
}
