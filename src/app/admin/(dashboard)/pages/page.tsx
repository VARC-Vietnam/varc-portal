import Link from "next/link";
import { listPages, getPageLocale } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function AdminPagesPage() {
  const pages = await listPages();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Pages</h1>
        <Link
          href="/admin/pages/new"
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          New page
        </Link>
      </div>

      {pages.length === 0 ? (
        <p className="mt-8 text-gray-600">No pages yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Title (VI)</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Nav</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {pages.map((page) => {
                const vi = getPageLocale(page, "vi");
                return (
                  <tr key={String(page._id)} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/pages/${String(page._id)}`}
                        className="font-medium hover:underline"
                      >
                        {vi.title || "(untitled)"}
                      </Link>
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
