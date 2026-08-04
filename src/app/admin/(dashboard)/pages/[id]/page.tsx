import { notFound } from "next/navigation";
import { PageEditor, emptyPageForm } from "@/components/admin/page-editor";
import { getPageById, getPageLocale } from "@/lib/cms";
import { normalizeEditorHtml } from "@/lib/html";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPagePage({ params }: Props) {
  const { id } = await params;
  const page = await getPageById(id);
  if (!page) notFound();

  const vi = getPageLocale(page, "vi");
  const en = getPageLocale(page, "en");

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit page</h1>
      <PageEditor
        pageId={id}
        initial={{
          ...emptyPageForm,
          status: page.status === "published" ? "published" : "draft",
          showInNav: Boolean(page.showInNav),
          sortOrder: page.sortOrder ?? 0,
          locales: {
            vi: {
              title: vi.title,
              content: normalizeEditorHtml(vi.content),
              metaTitle: vi.metaTitle,
              metaDescription: vi.metaDescription,
            },
            en: {
              title: en.title,
              content: normalizeEditorHtml(en.content),
              metaTitle: en.metaTitle,
              metaDescription: en.metaDescription,
            },
          },
        }}
      />
    </div>
  );
}
