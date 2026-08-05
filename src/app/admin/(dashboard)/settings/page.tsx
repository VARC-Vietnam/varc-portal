import { getSiteSettingsFormValues } from "@/lib/cms";
import { SiteSettingsEditor } from "@/components/admin/site-settings-editor";

export const dynamic = "force-dynamic";

export default async function AdminSiteSettingsPage() {
  const initial = await getSiteSettingsFormValues();

  return (
    <div>
      <h1 className="text-2xl font-semibold">Site Settings</h1>
      <p className="mt-2 text-sm text-gray-600">
        Update site name, title, logo, tagline, SEO metadata, and copyright.
      </p>
      <div className="mt-8">
        <SiteSettingsEditor initial={initial} />
      </div>
    </div>
  );
}
