import { notFound } from "next/navigation";
import {
  CategoryEditor,
  emptyCategoryForm,
} from "@/components/admin/category-editor";
import { getCategoryById, getCategoryLocale } from "@/lib/cms";
import { UNCATEGORIZED_KEY } from "@/lib/soft-delete";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditCategoryPage({ params }: Props) {
  const { id } = await params;
  const category = await getCategoryById(id);
  if (!category || category.deletedAt) notFound();

  const vi = getCategoryLocale(category, "vi");
  const en = getCategoryLocale(category, "en");
  const isSystem =
    Boolean(category.isSystem) || category.key === UNCATEGORIZED_KEY;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit category</h1>
      <CategoryEditor
        categoryId={id}
        isSystem={isSystem}
        initial={{
          ...emptyCategoryForm,
          locales: {
            vi: { name: vi.name, description: vi.description },
            en: { name: en.name, description: en.description },
          },
        }}
      />
    </div>
  );
}
