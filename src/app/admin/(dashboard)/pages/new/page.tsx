import { PageEditor, emptyPageForm } from "@/components/admin/page-editor";
import { requireSitePage } from "@/lib/admin-access";

export default async function NewPagePage() {
  await requireSitePage();

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">New page</h1>
      <PageEditor initial={emptyPageForm} />
    </div>
  );
}
