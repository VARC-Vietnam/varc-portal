import Link from "next/link";
import { listPages, getPageLocale } from "@/lib/cms";
import { restorePageAction } from "@/lib/actions";
import { AdminListTabs } from "@/components/admin/admin-list-tabs";
import { RestoreButton } from "@/components/admin/restore-button";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminPagesPage({ searchParams }: Props) {
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
        {!trash ? (
          <Link
            href="/admin/pages/new"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            New page
          </Link>
        ) : null}
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
                <th className="px-4 py-3 font-medium">Nav</th>
                <th className="px-4 py-3 font-medium">Status</th>
                {trash ? (
                  <>
                    <th className="px-4 py-3 font-medium">Deleted</th>
                    <th className="px-4 py-3 font-medium text-right">Actions</th>
                  </>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const vi = getPageLocale(page, "vi");
                const id = String(page._id);
                return (
                  <tr key={id} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      {trash ? (
                        <span className="font-medium">
                          {vi.title || "(untitled)"}
                        </span>
                      ) : (
                        <Link
                          href={`/admin/pages/${id}`}
                          className="font-medium hover:underline"
                        >
                          {vi.title || "(untitled)"}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {vi.slug || "—"}
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
                    {trash ? (
                      <>
                        <td className="px-4 py-3 text-gray-500">
                          {page.deletedAt
                            ? new Date(page.deletedAt).toLocaleString("vi-VN")
                            : "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <RestoreButton
                            restoreAction={restorePageAction.bind(null, id)}
                          />
                        </td>
                      </>
                    ) : null}
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
