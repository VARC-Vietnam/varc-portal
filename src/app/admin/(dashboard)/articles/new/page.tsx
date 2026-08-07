import {
  ArticleEditor,
  emptyArticleForm,
} from "@/components/admin/article-editor";
import { requireEditorialPage } from "@/lib/admin-access";
import { categorySelectOptions, listCategories } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function NewArticlePage() {
  await requireEditorialPage();

  const categories = await listCategories();

  return (
    <ArticleEditor
      heading="New article"
      initial={emptyArticleForm}
      categories={categorySelectOptions(categories, "vi")}
    />
  );
}
