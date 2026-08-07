import { PageEditor, emptyPageForm } from "@/components/admin/page-editor";
import { requireSitePage } from "@/lib/admin-access";
import { getLocaleContent, listAllArticles } from "@/lib/articles";
import {
  listPageTemplateOptions,
  listPageTemplatesAdmin,
  parseLayout,
} from "@/lib/blocks/templates";
import { emptyLayout, type TemplateLayout } from "@/lib/blocks/types";
import { categorySelectOptions, listCategories } from "@/lib/cms";

export default async function NewPagePage() {
  await requireSitePage();
  const [templateOptions, templateDocs, articles, categories] =
    await Promise.all([
      listPageTemplateOptions(),
      listPageTemplatesAdmin(),
      listAllArticles(),
      listCategories(),
    ]);

  const defaultLayouts: Record<string, TemplateLayout> = {};
  for (const doc of templateDocs) {
    defaultLayouts[doc.key] = parseLayout(doc.layout) ?? emptyLayout();
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New page</h1>
      <PageEditor
        initial={emptyPageForm}
        templates={templateOptions}
        defaultLayouts={defaultLayouts}
        articleOptions={articles.map((article) => ({
          id: String(article._id),
          label:
            getLocaleContent(article, "vi").title ||
            getLocaleContent(article, "en").title ||
            String(article._id),
        }))}
        categoryOptions={categorySelectOptions(categories, "vi")}
      />
    </div>
  );
}
