import Link from "next/link";
import { listPages, getPageLocale } from "@/lib/cms";
import {
  deletePageAction,
  restorePageAction,
  permanentlyDeletePageAction,
  emptyPagesTrashAction,
} from "@/lib/actions";
import { AdminListTabs } from "@/components/admin/admin-list-tabs";
import { AdminLocaleStatus } from "@/components/admin/admin-locale-status";
import { ActiveRowActions } from "@/components/admin/active-row-actions";
import { TrashRowActions } from "@/components/admin/trash-row-actions";
import { EmptyTrashButton } from "@/components/admin/empty-trash-button";
import { requireSitePage } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

function pageLocaleReady(locale: { title: string; slug: string }) {
  return Boolean(locale.title.trim() && locale.slug.trim());
}

export default async function AdminPagesPage({ searchParams }: Props) {
  await requireSitePage();

  const { tab } = await searchParams;
  const trash = tab === "trash";
  const [activeItems, trashItems] = await Promise.all([
    listPages(),
    listPages({ trash: true }),
  ]);
  const pages = trash ? trashItems : activeItems;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pages</h1>
        {trash ? (
          <EmptyTrashButton
            count={trashItems.length}
            itemLabel="pages"
            emptyAction={emptyPagesTrashAction}
          />
        ) : (
          <Link
            href="/admin/pages/new"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            New page
          </Link>
        )}
      </div>

      <AdminListTabs
        basePath="/admin/pages"
        active={trash ? "trash" : "active"}
        activeCount={activeItems.length}
        trashCount={trashItems.length}
      />

      {pages.length === 0 ? (
        <p className="mt-8 text-gray-600">
          {trash ? "Trash is empty." : "No pages yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Title (VI)</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Languages</th>
                <th className="px-4 py-3 font-medium">Nav</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">
                  {trash ? "Deleted" : "Updated"}
                </th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const vi = getPageLocale(page, "vi");
                const en = getPageLocale(page, "en");
                const id = String(page._id);
                return (
                  <tr key={id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium">
                      {vi.title || "(untitled)"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {vi.slug || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <AdminLocaleStatus
                        viReady={pageLocaleReady(vi)}
                        enReady={pageLocaleReady(en)}
                      />
                    </td>
                    <td className="px-4 py-3">
                      {page.showInNav ? "Yes" : "No"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          page.status === "published"
                            ? "text-green-700"
                            : "text-amber-700"
                        }
                      >
                        {page.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {trash
                        ? page.deletedAt
                          ? new Date(page.deletedAt).toLocaleString("vi-VN")
                          : "-"
                        : page.updatedAt
                          ? new Date(page.updatedAt).toLocaleString("vi-VN")
                          : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {trash ? (
                        <TrashRowActions
                          restoreAction={restorePageAction.bind(null, id)}
                          deleteAction={permanentlyDeletePageAction.bind(null, id)}
                          itemLabel={vi.title || "this page"}
                        />
                      ) : (
                        <ActiveRowActions
                          editHref={`/admin/pages/${id}`}
                          deleteAction={deletePageAction.bind(null, id)}
                          deleteConfirmMessage="Move this page to trash?"
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
