import { redirect } from "next/navigation";
import { requireEditorialPage } from "@/lib/admin-access";

type Props = {
  searchParams: Promise<{ parentId?: string }>;
};

/** Legacy route — create/edit now happens in a modal on /admin/categories. */
export default async function NewCategoryPage({ searchParams }: Props) {
  await requireEditorialPage();
  const { parentId } = await searchParams;
  if (parentId) {
    redirect(`/admin/categories?parentId=${encodeURIComponent(parentId)}`);
  }
  redirect("/admin/categories");
}
