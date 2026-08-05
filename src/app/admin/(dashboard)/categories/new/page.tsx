import {
  CategoryEditor,
  emptyCategoryForm,
} from "@/components/admin/category-editor";
import { requireEditorialPage } from "@/lib/admin-access";

export default async function NewCategoryPage() {
  await requireEditorialPage();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New category</h1>
      <CategoryEditor initial={emptyCategoryForm} />
    </div>
  );
}
