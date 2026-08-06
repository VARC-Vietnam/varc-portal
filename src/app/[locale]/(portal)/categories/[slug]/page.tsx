import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import {
  getCategoryLocale,
  getPublicSiteBranding,
  getSiteSettingsDocument,
  listCategories,
} from "@/lib/cms";
import {
  getPageTemplateByKey,
  parseLayout,
} from "@/lib/blocks/templates";
import { resolveLayoutBlocks } from "@/lib/blocks/resolve";
import { emptyLayout } from "@/lib/blocks/types";
import { TemplateLayoutRenderer } from "@/components/portal/blocks/template-layout-renderer";
import { SetLocaleAlternates } from "@/components/portal/locale-alternates";
import { categoryHref } from "@/lib/locale-hrefs";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

async function findPublishedCategory(locale: AppLocale, slug: string) {
  const categories = await listCategories();
  return (
    categories.find((category) => {
      const preferred = getCategoryLocale(category, locale);
      const fallback = getCategoryLocale(
        category,
        locale === "en" ? "vi" : "en",
      );
      return preferred.slug === slug || fallback.slug === slug;
    }) ?? null
  );
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as AppLocale;
  const category = await findPublishedCategory(locale, slug);
  if (!category) return { title: "Not found" };
  const content = getCategoryLocale(category, locale);
  const branding = await getPublicSiteBranding(locale);
  return {
    title: content.name,
    description: content.description || undefined,
    openGraph: {
      title: `${content.name} - ${branding.siteName}`,
      description: content.description || undefined,
    },
  };
}

export default async function CategoryArchivePage({ params }: Props) {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);

  const tHome = await getTranslations("home");
  const [category, settings, branding] = await Promise.all([
    findPublishedCategory(locale, slug),
    getSiteSettingsDocument(),
    getPublicSiteBranding(locale),
  ]);
  if (!category) notFound();

  const content = getCategoryLocale(category, locale);
  const vi = getCategoryLocale(category, "vi");
  const en = getCategoryLocale(category, "en");
  const templateKey = settings?.categoryTemplateKey?.trim() || "category";
  const template = await getPageTemplateByKey(templateKey);
  const layout = parseLayout(template?.layout) ?? emptyLayout();

  const resolved = await resolveLayoutBlocks(
    layout,
    locale,
    {
      title: content.name,
      contentHtml: "",
      galleryItems: [],
    },
    { categoryIds: [String(category._id)] },
  );

  return (
    <div className="py-10 md:py-14">
      <SetLocaleAlternates
        vi={vi.slug ? categoryHref(vi.slug) : null}
        en={en.slug ? categoryHref(en.slug) : null}
      />
      <div className="mx-auto mb-6 max-w-6xl px-4 md:px-6">
        <Link href="/" className="text-sm text-accent hover:underline">
          {branding.siteName}
        </Link>
      </div>
      {layout.sections.some((s) => s.blocks.length > 0) ? (
        <TemplateLayoutRenderer
          layout={layout}
          resolved={resolved}
          locale={locale}
          siteName={branding.siteName}
          pageTitle={content.name}
          labels={{
            readMore: tHome("readMore"),
            publishedAt: tHome("publishedAt"),
            featuredLabel: tHome("featuredLabel"),
            latestTitle: content.name,
            previous: tHome("previousSlide"),
            next: tHome("nextSlide"),
          }}
        />
      ) : (
        <div className="mx-auto max-w-6xl px-4 md:px-6">
          <h1 className="font-display text-4xl text-foreground">{content.name}</h1>
          {content.description ? (
            <p className="mt-4 text-muted">{content.description}</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
