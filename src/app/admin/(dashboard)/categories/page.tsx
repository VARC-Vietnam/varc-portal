import Link from "next/link";
import { listCategories, getCategoryLocale } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function AdminCategoriesPage() {
  const categories = await listCategories();

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Categories</h1>
        <Link
          href="/admin/categories/new"
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          New category
        </Link>
      </div>

      {categories.length === 0 ? (
        <p className="mt-8 text-gray-600">No categories yet.</p>
      ) : (
        <div className="mt-8 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name (VI)</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">EN</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const vi = getCategoryLocale(category, "vi");
                const en = getCategoryLocale(category, "en");
                return (
                  <tr key={String(category._id)} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/categories/${String(category._id)}`}
                        className="font-medium hover:underline"
                      >
                        {vi.name || "(untitled)"}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {vi.slug || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {en.name || "Missing"}
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
