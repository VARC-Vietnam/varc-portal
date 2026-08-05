import { requireEditorialPage } from "@/lib/admin-access";
import { emptyMediaTrashAction } from "@/lib/actions";
import { getMediaConfig } from "@/lib/media/config";
import { countMedia, listMediaAdmin } from "@/lib/media/library";
import { AdminListTabs } from "@/components/admin/admin-list-tabs";
import { EmptyTrashButton } from "@/components/admin/empty-trash-button";
import { MediaGallery } from "@/components/admin/media-gallery";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string; page?: string }>;
};

function parsePage(raw: string | undefined): number {
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 1) return 1;
  return Math.floor(value);
}

export default async function AdminMediaPage({ searchParams }: Props) {
  await requireEditorialPage();

  const { tab, page: pageRaw } = await searchParams;
  const trash = tab === "trash";
  const page = parsePage(pageRaw);

  const [list, activeCount, trashCount] = await Promise.all([
    listMediaAdmin({ trash, page }),
    countMedia(),
    countMedia({ trash: true }),
  ]);

  let maxBytes = 50 * 1024 * 1024;
  try {
    maxBytes = getMediaConfig().maxBytes;
  } catch {
    // Config may throw if S3 is misconfigured; gallery still lists existing items.
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Media</h1>
        {trash ? (
          <EmptyTrashButton
            count={trashCount}
            itemLabel="media files"
            emptyAction={emptyMediaTrashAction}
          />
        ) : null}
      </div>
      <p className="mt-2 text-sm text-gray-600">
        {trash
          ? "Restore or permanently delete trashed media."
          : "Upload and manage pictures and videos for the portal."}
      </p>

      <AdminListTabs
        basePath="/admin/media"
        active={trash ? "trash" : "active"}
        activeCount={activeCount}
        trashCount={trashCount}
      />

      <div className="mt-8">
        <MediaGallery
          initialItems={list.items}
          trash={trash}
          maxBytes={maxBytes}
          page={list.page}
          pageSize={list.pageSize}
          total={list.total}
          totalPages={list.totalPages}
        />
      </div>
    </div>
  );
}
