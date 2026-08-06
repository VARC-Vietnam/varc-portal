import { TemplateEditor } from "@/components/admin/template-builder/template-editor";
import { requireSitePage } from "@/lib/admin-access";
import { emptyLayout } from "@/lib/blocks/types";
import { listAllArticles, getLocaleContent } from "@/lib/articles";
import { listCategories, getCategoryLocale } from "@/lib/cms";

export default async function NewTemplatePage() {
  await requireSitePage();
  const [articles, categories] = await Promise.all([
    listAllArticles(),
    listCategories(),
  ]);

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New template</h1>
      <TemplateEditor
        initial={{
          name: "",
          description: "",
          key: "",
          isSystem: false,
          layout: emptyLayout(),
        }}
        articleOptions={articles.map((article) => ({
          id: String(article._id),
          label:
            getLocaleContent(article, "vi").title ||
            getLocaleContent(article, "en").title ||
            String(article._id),
        }))}
        categoryOptions={categories.map((category) => ({
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
