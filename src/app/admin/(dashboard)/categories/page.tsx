import Link from "next/link";
import { listCategories, getCategoryLocale } from "@/lib/cms";
import {
  deleteCategoryAction,
  restoreCategoryAction,
  permanentlyDeleteCategoryAction,
  emptyCategoriesTrashAction,
} from "@/lib/actions";
import { AdminListTabs } from "@/components/admin/admin-list-tabs";
import { ActiveRowActions } from "@/components/admin/active-row-actions";
import { TrashRowActions } from "@/components/admin/trash-row-actions";
import { EmptyTrashButton } from "@/components/admin/empty-trash-button";
import { requireEditorialPage } from "@/lib/admin-access";
import { UNCATEGORIZED_KEY } from "@/lib/soft-delete";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminCategoriesPage({ searchParams }: Props) {
  await requireEditorialPage();

  const { tab } = await searchParams;
  const trash = tab === "trash";
  const [activeItems, trashItems] = await Promise.all([
    listCategories(),
    listCategories({ trash: true }),
  ]);
  const categories = trash ? trashItems : activeItems;

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">Categories</h1>
        {trash ? (
          <EmptyTrashButton
            count={trashItems.length}
            itemLabel="categories"
            emptyAction={emptyCategoriesTrashAction}
          />
        ) : (
          <Link
            href="/admin/categories/new"
            className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
          >
            New category
          </Link>
        )}
      </div>

      <AdminListTabs
        basePath="/admin/categories"
        active={trash ? "trash" : "active"}
        activeCount={activeItems.length}
        trashCount={trashItems.length}
      />

      {categories.length === 0 ? (
        <p className="mt-8 text-gray-600">
          {trash ? "Trash is empty." : "No categories yet."}
        </p>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
              <tr>
                <th className="px-4 py-3 font-medium">Name (VI)</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">EN</th>
                {trash ? (
                  <th className="px-4 py-3 font-medium">Deleted</th>
                ) : null}
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => {
                const vi = getCategoryLocale(category, "vi");
                const en = getCategoryLocale(category, "en");
                const id = String(category._id);
                const isBuiltin =
                  Boolean(category.isSystem) ||
                  category.key === UNCATEGORIZED_KEY;
                return (
                  <tr key={id} className="border-b border-gray-100">
                    <td className="px-4 py-3 font-medium">
                      {vi.name || "(untitled)"}
                      {!trash && isBuiltin ? (
                        <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-gray-600 uppercase">
                          Built-in
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">
                      {vi.slug || "—"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {en.name || "Missing"}
                    </td>
                    {trash ? (
                      <td className="px-4 py-3 text-gray-500">
                        {category.deletedAt
                          ? new Date(category.deletedAt).toLocaleString("vi-VN")
                          : "-"}
                      </td>
                    ) : null}
                    <td className="px-4 py-3 text-right">
                      {trash ? (
                        <TrashRowActions
                          restoreAction={restoreCategoryAction.bind(null, id)}
                          deleteAction={permanentlyDeleteCategoryAction.bind(
                            null,
                            id,
                          )}
                          itemLabel={vi.name || "this category"}
                        />
                      ) : (
                        <ActiveRowActions
                          editHref={`/admin/categories/${id}`}
                          deleteAction={
                            isBuiltin
                              ? undefined
                              : deleteCategoryAction.bind(null, id)
                          }
                          deleteConfirmMessage="Move this category to trash?"
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
