import Link from "next/link";
import { listPageTemplatesAdmin } from "@/lib/blocks/templates";
import { requireSitePage } from "@/lib/admin-access";
import { TemplateListActions } from "@/components/admin/template-builder/template-list-actions";

export const dynamic = "force-dynamic";

export default async function AdminTemplatesPage() {
  await requireSitePage();
  const templates = await listPageTemplatesAdmin();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Templates</h1>
          <p className="mt-1 text-sm text-gray-600">
            Layout presets for CMS pages. System templates can be edited but not
            deleted.
          </p>
        </div>
        <Link
          href="/admin/templates/new"
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black"
        >
          New template
        </Link>
      </div>

      <div className="mt-8 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="hidden w-full text-left text-sm md:table">
          <thead className="border-b border-gray-200 bg-gray-50 text-xs tracking-wide text-gray-500 uppercase">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Blocks</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {templates.map((template) => {
              const id = String(template._id);
              const blockCount = (template.layout?.sections ?? []).reduce(
                (sum, section) => sum + (section.blocks?.length ?? 0),
                0,
              );
              return (
                <tr key={id} className="border-b border-gray-100 last:border-0">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/templates/${id}`}
                      className="font-medium hover:underline"
                    >
                      {template.name}
                    </Link>
                    {template.description ? (
                      <p className="mt-0.5 text-xs text-gray-500">
                        {template.description}
                      </p>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{template.key}</td>
                  <td className="px-4 py-3">{blockCount}</td>
                  <td className="px-4 py-3">
                    {template.isSystem ? "System" : "Custom"}
                  </td>
                  <td className="px-4 py-3">
                    <TemplateListActions
                      id={id}
                      isSystem={Boolean(template.isSystem)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <ul className="divide-y divide-gray-100 md:hidden">
          {templates.map((template) => {
            const id = String(template._id);
            return (
              <li key={id} className="space-y-2 p-4">
                <Link
                  href={`/admin/templates/${id}`}
                  className="font-medium hover:underline"
                >
                  {template.name}
                </Link>
                <p className="font-mono text-xs text-gray-500">{template.key}</p>
                <TemplateListActions
                  id={id}
                  isSystem={Boolean(template.isSystem)}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
