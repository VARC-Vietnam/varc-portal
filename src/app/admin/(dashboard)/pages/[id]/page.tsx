import { notFound } from "next/navigation";
import { PageEditor, emptyPageForm } from "@/components/admin/page-editor";
import { requireSitePage } from "@/lib/admin-access";
import { getPageById, getPageLocale } from "@/lib/cms";
import { normalizeEditorHtml } from "@/lib/html";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPagePage({ params }: Props) {
  await requireSitePage();

  const { id } = await params;
  const page = await getPageById(id);
  if (!page || page.deletedAt) notFound();

  const vi = getPageLocale(page, "vi");
  const en = getPageLocale(page, "en");
  const template = page.template === "gallery" ? "gallery" : "default";
  const galleryItems = (page.galleryItems ?? [])
    .filter((item) => item?.mediaId && item?.url)
    .map((item) => ({
      mediaId: String(item.mediaId),
      url: String(item.url),
      alt: String(item.alt ?? ""),
      originalName: String(item.originalName ?? ""),
    }));

  return (
    <div>
      <h1 className="mb-6 text-2xl font-semibold">Edit page</h1>
      <PageEditor
        pageId={id}
        initial={{
          ...emptyPageForm,
          status: page.status === "published" ? "published" : "draft",
          template,
          galleryItems,
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
