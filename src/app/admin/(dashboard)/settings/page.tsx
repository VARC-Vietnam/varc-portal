import {
  getPageLocale,
  getSiteSettingsFormValues,
  listPages,
} from "@/lib/cms";
import { listPageTemplateOptions } from "@/lib/blocks/templates";
import { SiteSettingsEditor } from "@/components/admin/site-settings-editor";
import { requireSitePage } from "@/lib/admin-access";

export const dynamic = "force-dynamic";

export default async function AdminSiteSettingsPage() {
  await requireSitePage();

  const [initial, pages, templates] = await Promise.all([
    getSiteSettingsFormValues(),
    listPages(),
    listPageTemplateOptions(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-semibold">Site Settings</h1>
      <p className="mt-2 text-sm text-gray-600">
        Update site name, title, logo, tagline, SEO metadata, copyright, and
        route templates.
      </p>
      <div className="mt-8">
        <SiteSettingsEditor
          initial={initial}
          pageOptions={pages
            .filter((page) => page.status === "published")
            .map((page) => ({
              id: String(page._id),
              title:
                getPageLocale(page, "vi").title ||
                getPageLocale(page, "en").title ||
                String(page._id),
            }))}
          templateOptions={templates.map((template) => ({
            key: template.key,
            name: template.name,
          }))}
        />
      </div>
    </div>
  );
}
