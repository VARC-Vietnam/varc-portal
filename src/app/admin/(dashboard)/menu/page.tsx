import {
  getPageLocale,
  importNavPagesIntoMenuIfEmpty,
  listMenuItemsAdmin,
  listPages,
} from "@/lib/cms";
import { emptyMenuTrashAction } from "@/lib/actions";
import { requireSitePage } from "@/lib/admin-access";
import { AdminListTabs } from "@/components/admin/admin-list-tabs";
import { EmptyTrashButton } from "@/components/admin/empty-trash-button";
import { MenuManager } from "@/components/admin/menu-manager";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminMenuPage({ searchParams }: Props) {
  await requireSitePage();

  const { tab } = await searchParams;
  const trash = tab === "trash";
  const imported = trash ? 0 : await importNavPagesIntoMenuIfEmpty();
  const [activeItems, trashItems, pages] = await Promise.all([
    listMenuItemsAdmin(),
    listMenuItemsAdmin({ trash: true }),
    listPages(),
  ]);
  const items = trash ? trashItems : activeItems;

  const pageOptions = pages.map((page) => {
    const vi = getPageLocale(page, "vi");
    const en = getPageLocale(page, "en");
    return {
      id: String(page._id),
      title: vi.title || en.title || "(untitled)",
      status: page.status,
    };
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Menus</h1>
        {trash ? (
          <EmptyTrashButton
            count={trashItems.length}
            itemLabel="menu items"
            emptyAction={emptyMenuTrashAction}
          />
        ) : null}
      </div>
      <p className="mt-2 text-sm text-gray-600">
        {trash
          ? "Restore or permanently delete trashed menu items."
          : "Manage Navigation Menu and Footer Menu items, including order."}
        {!trash && imported > 0
          ? ` Imported ${imported} existing nav page${imported === 1 ? "" : "s"}.`
          : null}
      </p>

      <AdminListTabs
        basePath="/admin/menu"
        active={trash ? "trash" : "active"}
        activeCount={activeItems.length}
        trashCount={trashItems.length}
      />

      <div className="mt-8">
        <MenuManager
          initialItems={items}
          pages={pageOptions}
          trash={trash}
        />
      </div>
    </div>
  );
}
