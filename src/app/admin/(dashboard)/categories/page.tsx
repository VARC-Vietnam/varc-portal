import {
  listCategoriesAdmin,
  getCategoryLocale,
  listCategories,
} from "@/lib/cms";
import {
  restoreCategoryAction,
  permanentlyDeleteCategoryAction,
  emptyCategoriesTrashAction,
} from "@/lib/actions";
import { AdminListTabs } from "@/components/admin/admin-list-tabs";
import { AdminLocaleStatus } from "@/components/admin/admin-locale-status";
import { TrashRowActions } from "@/components/admin/trash-row-actions";
import { EmptyTrashButton } from "@/components/admin/empty-trash-button";
import { CategoryManager } from "@/components/admin/category-manager";
import { requireEditorialPage } from "@/lib/admin-access";
import { UNCATEGORIZED_KEY } from "@/lib/soft-delete";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string; edit?: string; parentId?: string }>;
};

function categoryLocaleReady(locale: { name: string; slug: string }) {
  return Boolean(locale.name.trim() && locale.slug.trim());
}

export default async function AdminCategoriesPage({ searchParams }: Props) {
  await requireEditorialPage();

  const { tab, edit, parentId } = await searchParams;
  const trash = tab === "trash";
  const [activeItems, trashItems, trashDocs] = await Promise.all([
    listCategoriesAdmin(),
    listCategoriesAdmin({ trash: true }),
    trash ? listCategories({ trash: true }) : Promise.resolve([]),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Categories</h1>
        {trash ? (
          <EmptyTrashButton
            count={trashItems.length}
            itemLabel="categories"
            emptyAction={emptyCategoriesTrashAction}
          />
        ) : null}
      </div>

      <AdminListTabs
        basePath="/admin/categories"
        active={trash ? "trash" : "active"}
        activeCount={activeItems.length}
        trashCount={trashItems.length}
      />

      {trash ? (
        trashDocs.length === 0 ? (
          <p className="mt-8 text-gray-600">Trash is empty.</p>
        ) : (
          <div className="mt-6 overflow-x-auto rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full text-left text-sm">
              <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
                <tr>
                  <th className="px-4 py-3 font-medium">Name (VI)</th>
                  <th className="px-4 py-3 font-medium">Slug</th>
                  <th className="px-4 py-3 font-medium">Languages</th>
                  <th className="px-4 py-3 font-medium">Deleted</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {trashDocs.map((category) => {
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
                        {isBuiltin ? (
                          <span className="ml-2 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-gray-600 uppercase">
                            Built-in
                          </span>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-gray-500">
                        {vi.slug || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <AdminLocaleStatus
                          viReady={categoryLocaleReady(vi)}
                          enReady={categoryLocaleReady(en)}
                        />
                      </td>
                      <td className="px-4 py-3 text-gray-500">
                        {category.deletedAt
                          ? new Date(category.deletedAt).toLocaleString("vi-VN")
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <TrashRowActions
                          restoreAction={restoreCategoryAction.bind(null, id)}
                          deleteAction={permanentlyDeleteCategoryAction.bind(
                            null,
                            id,
                          )}
                          itemLabel={vi.name || "this category"}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <CategoryManager
          initialItems={activeItems}
          initialEditId={edit ?? null}
          initialParentId={parentId ?? null}
        />
      )}
    </div>
  );
}
