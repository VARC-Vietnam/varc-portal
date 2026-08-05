import Link from "next/link";
import { listAllArticles, getLocaleContent } from "@/lib/articles";
import { listCategories, getCategoryLocale } from "@/lib/cms";
import { restoreArticleAction } from "@/lib/actions";
import { AdminListTabs } from "@/components/admin/admin-list-tabs";
import { RestoreButton } from "@/components/admin/restore-button";
import { requireEditorialPage } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminArticlesPage({ searchParams }: Props) {
  await requireEditorialPage();

  const { tab } = await searchParams;
  const trash = tab === "trash";
  const [activeItems, trashItems, activeCategories, trashCategories] =
    await Promise.all([
      listAllArticles(),
      listAllArticles({ trash: true }),
      listCategories(),
      listCategories({ trash: true }),
    ]);
  const articles = trash ? trashItems : activeItems;

  const categoryNameById = new Map<string, string>();
  for (const category of [...activeCategories, ...trashCategories]) {
    const name =
      getCategoryLocale(category, "vi").name ||
      getCategoryLocale(category, "en").name;
    if (name) categoryNameById.set(String(category._id), name);
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Articles</h1>
        {!trash ? (
          <Link
            href="/admin/articles/new"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            New article
          </Link>
        ) : null}
      </div>

      <AdminListTabs
        basePath="/admin/articles"
        active={trash ? "trash" : "active"}
        activeCount={activeItems.length}
        trashCount={trashItems.length}
      />

      {articles.length === 0 ? (
        <p className="mt-8 text-gray-600">
          {trash ? "Trash is empty." : "No articles yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Title (VI)</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">EN</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">
                  {trash ? "Deleted" : "Updated"}
                </th>
                {trash ? (
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                ) : null}
              </tr>
            </thead>
            <tbody>
              {articles.map((article) => {
                const vi = getLocaleContent(article, "vi");
                const en = getLocaleContent(article, "en");
                const id = String(article._id);
                const categoryNames = (article.categoryIds ?? [])
                  .map((categoryId) => categoryNameById.get(String(categoryId)))
                  .filter(Boolean);
                return (
                  <tr key={id} className="border-b border-gray-100">
                    <td className="px-4 py-3">
                      {trash ? (
                        <span className="font-medium text-gray-900">
                          {vi.title || "(untitled)"}
                        </span>
                      ) : (
                        <Link
                          href={`/admin/articles/${id}`}
                          className="font-medium text-gray-900 hover:underline"
                        >
                          {vi.title || "(untitled)"}
                        </Link>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {categoryNames.length > 0
                        ? categoryNames.join(", ")
                        : "—"}
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
                      {trash
                        ? article.deletedAt
                          ? new Date(article.deletedAt).toLocaleString("vi-VN")
                          : "-"
                        : article.updatedAt
                          ? new Date(article.updatedAt).toLocaleString("vi-VN")
                          : "-"}
                    </td>
                    {trash ? (
                      <td className="px-4 py-3 text-right">
                        <RestoreButton
                          restoreAction={restoreArticleAction.bind(null, id)}
                        />
                      </td>
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
