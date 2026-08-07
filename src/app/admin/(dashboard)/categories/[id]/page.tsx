import { redirect } from "next/navigation";
import { requireEditorialPage } from "@/lib/admin-access";

type Props = {
  params: Promise<{ id: string }>;
};

/** Legacy route — create/edit now happens in a modal on /admin/categories. */
export default async function EditCategoryPage({ params }: Props) {
  await requireEditorialPage();
  const { id } = await params;
  redirect(`/admin/categories?edit=${encodeURIComponent(id)}`);
}
