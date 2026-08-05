import {
  getPageLocale,
  importNavPagesIntoMenuIfEmpty,
  listMenuItemsAdmin,
  listPages,
} from "@/lib/cms";
import { requireSitePage } from "@/lib/admin-access";
import { MenuManager } from "@/components/admin/menu-manager";

export const dynamic = "force-dynamic";

export default async function AdminMenuPage() {
  await requireSitePage();

  const imported = await importNavPagesIntoMenuIfEmpty();
  const [items, pages] = await Promise.all([
    listMenuItemsAdmin(),
    listPages(),
  ]);

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
      <h1 className="text-2xl font-semibold">Menus</h1>
      <p className="mt-2 text-sm text-gray-600">
        Manage Navigation Menu and Footer Menu items, including order.
        {imported > 0
          ? ` Imported ${imported} existing nav page${imported === 1 ? "" : "s"}.`
          : null}
      </p>
      <div className="mt-8">
        <MenuManager initialItems={items} pages={pageOptions} />
      </div>
    </div>
  );
}
