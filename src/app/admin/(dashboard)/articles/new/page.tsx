import {
  ArticleEditor,
  emptyArticleForm,
} from "@/components/admin/article-editor";
import { requireEditorialPage } from "@/lib/admin-access";
import { listCategories, getCategoryLocale } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requireEditorialPage();

  const categories = await listCategories();

  return (
    <ArticleEditor
      heading="New article"
      initial={emptyArticleForm}
      categories={categories.map((category) => ({
        id: String(category._id),
        label:
          getCategoryLocale(category, "vi").name ||
          getCategoryLocale(category, "en").name ||
          String(category._id),
      }))}
    />
  );
}
