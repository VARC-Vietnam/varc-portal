import Link from "next/link";
import { listAllArticles, getLocaleContent } from "@/lib/articles";

export const dynamic = "force-dynamic";

export default async function AdminArticlesPage() {
  const articles = await listAllArticles();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Articles</h1>
        <Link
          href="/admin/articles/new"
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          New article
        </Link>
      </div>

      {articles.length === 0 ? (
        <p className="mt-8 text-gray-600">No articles yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Title (VI)</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">EN</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Updated</th>
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => {
                const vi = getLocaleContent(article, "vi");
                const en = getLocaleContent(article, "en");
                return (
                  <tr key={String(article._id)} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/articles/${String(article._id)}`}
                        className="font-medium text-gray-900 hover:underline"
                      >
                        {vi.title || "(untitled)"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {vi.slug || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {en.title ? "Ready" : "Missing"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          article.status === "published"
                            ? "text-green-700"
                            : "text-amber-700"
                        }
                      >
                        {article.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">
                      {article.updatedAt
                        ? new Date(article.updatedAt).toLocaleString("vi-VN")
                        : "-"}
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
