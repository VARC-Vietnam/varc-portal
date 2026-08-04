import {
  CategoryEditor,
  emptyCategoryForm,
} from "@/components/admin/category-editor";

export default function NewCategoryPage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New category</h1>
      <CategoryEditor initial={emptyCategoryForm} />
    </div>
  );
}
