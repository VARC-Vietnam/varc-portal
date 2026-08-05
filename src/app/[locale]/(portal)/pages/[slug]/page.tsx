import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getPageLocale, getPublishedPageBySlug, getPublicSiteBranding } from "@/lib/cms";
import type { AppLocale } from "@/i18n/routing";
import { HtmlContent } from "@/components/portal/html-content";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as AppLocale;
  const page = await getPublishedPageBySlug(locale, slug);
  if (!page) return { title: "Not found" };

  const content = getPageLocale(page, locale);
  const branding = await getPublicSiteBranding(locale);
  const pageName = content.metaTitle || content.title;
  const documentTitle = `${pageName} - ${branding.siteName} | ${branding.siteTitle}`;
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3099";
  const path = `/${locale}/pages/${content.slug}`;
  const en = getPageLocale(page, "en");
  const vi = getPageLocale(page, "vi");

  return {
    title: pageName,
    description: content.metaDescription || undefined,
    alternates: {
      canonical: `${siteUrl}${path}`,
      languages: {
        vi: vi.slug ? `${siteUrl}/vi/pages/${vi.slug}` : undefined,
        en: en.slug ? `${siteUrl}/en/pages/${en.slug}` : undefined,
        "x-default": vi.slug ? `${siteUrl}/vi/pages/${vi.slug}` : undefined,
      },
    },
    openGraph: {
      title: documentTitle,
      description: content.metaDescription || undefined,
      url: `${siteUrl}${path}`,
    },
  };
}

export default async function CmsPage({ params }: Props) {
  const { locale: localeParam, slug } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);

  const t = await getTranslations("page");
  const page = await getPublishedPageBySlug(locale, slug);
  const content = page ? getPageLocale(page, locale) : null;
  if (!page || !content?.slug || !content.title) {
    notFound();
  }

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6">
      <Link href="/" className="text-sm text-accent hover:underline">
        {t("backHome")}
      </Link>
      <header className="mt-6 border-b border-border pb-8">
        <h1 className="font-display text-4xl leading-tight text-foreground md:text-5xl">
          {content.title}
        </h1>
      </header>
      <HtmlContent html={content.content} />
    </article>
  );
}
