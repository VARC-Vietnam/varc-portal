"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ImageSourceField } from "@/components/admin/image-source-field";
import { saveSiteSettingsAction } from "@/lib/actions";
import type { SiteSettingsFormValues } from "@/lib/validations/article";

type Props = {
  initial: SiteSettingsFormValues;
};

type SiteLocaleFields = SiteSettingsFormValues["locales"]["vi"];

export function SiteSettingsEditor({ initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState(initial);
  const [tab, setTab] = useState<"vi" | "en">("vi");

  function updateLocale(
    locale: "vi" | "en",
    field: keyof SiteLocaleFields,
    value: string,
  ) {
    setForm((prev) => ({
      ...prev,
      locales: {
        ...prev.locales,
        [locale]: { ...prev.locales[locale], [field]: value },
      },
    }));
    setSaved(false);
  }

  function onSave() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const result = await saveSiteSettingsAction(form);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  const locale = form.locales[tab];

  return (
    <div className="space-y-6">
      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="rounded border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-800">
          Site settings saved.
        </p>
      ) : null}

      <section className="space-y-4 rounded-lg border border-gray-200 bg-white p-5">
        <h2 className="text-base font-semibold">Brand assets</h2>
        <p className="text-sm text-gray-600">
          Shared across languages. Prefer a public URL for logos used in the
          header.
        </p>
        <ImageSourceField
          label="Logo"
          description="Shown in the site header next to or instead of the site name."
          value={form.logoUrl}
          onChange={(logoUrl) => {
            setForm((prev) => ({ ...prev, logoUrl }));
            setSaved(false);
          }}
        />
        <ImageSourceField
          label="Favicon"
          description="Browser tab icon. Prefer a small PNG/ICO URL."
          value={form.faviconUrl}
          onChange={(faviconUrl) => {
            setForm((prev) => ({ ...prev, faviconUrl }));
            setSaved(false);
          }}
        />
        <ImageSourceField
          label="Default Open Graph image"
          description="Fallback social share image when a page has no OG image."
          value={form.ogImageUrl}
          onChange={(ogImageUrl) => {
            setForm((prev) => ({ ...prev, ogImageUrl }));
            setSaved(false);
          }}
        />
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setTab("vi")}
          className={`rounded px-3 py-1.5 text-sm ${
            tab === "vi" ? "bg-gray-900 text-white" : "border border-gray-300"
          }`}
        >
          Vietnamese
        </button>
        <button
          type="button"
          onClick={() => setTab("en")}
          className={`rounded px-3 py-1.5 text-sm ${
            tab === "en" ? "bg-gray-900 text-white" : "border border-gray-300"
          }`}
        >
          English
        </button>
      </div>

      <section className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 md:grid-cols-2">
        <h2 className="text-base font-semibold md:col-span-2">
          {tab === "vi" ? "Vietnamese content" : "English content"}
        </h2>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Site name</span>
          <input
            value={locale.siteName}
            onChange={(e) => updateLocale(tab, "siteName", e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
            placeholder="VARC"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">Site title</span>
          <input
            value={locale.siteTitle}
            onChange={(e) => updateLocale(tab, "siteTitle", e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
            placeholder="Full organization name"
          />
        </label>

        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block font-medium">Tagline</span>
          <textarea
            value={locale.tagline}
            onChange={(e) => updateLocale(tab, "tagline", e.target.value)}
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm md:col-span-2">
          <span className="mb-1 block font-medium">Copyright / footer text</span>
          <input
            value={locale.copyright}
            onChange={(e) => updateLocale(tab, "copyright", e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">SEO meta title</span>
          <input
            value={locale.metaTitle}
            onChange={(e) => updateLocale(tab, "metaTitle", e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
            placeholder="Defaults to site name if empty"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium">SEO meta description</span>
          <textarea
            value={locale.metaDescription}
            onChange={(e) =>
              updateLocale(tab, "metaDescription", e.target.value)
            }
            rows={3}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
      </section>

      <button
        type="button"
        disabled={pending}
        onClick={onSave}
        className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save settings"}
      </button>
    </div>
  );
}
