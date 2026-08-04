import { PageEditor, emptyPageForm } from "@/components/admin/page-editor";

export default function NewPagePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New page</h1>
      <PageEditor initial={emptyPageForm} />
    </div>
  );
}
