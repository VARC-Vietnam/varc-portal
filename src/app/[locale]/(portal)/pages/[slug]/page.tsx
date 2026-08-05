import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import { getPageLocale, getPublishedPageBySlug, getPublicSiteBranding } from "@/lib/cms";
import type { AppLocale } from "@/i18n/routing";
import { HtmlContent } from "@/components/portal/html-content";
import { GalleryPageView } from "@/components/portal/gallery-page-view";
import { SetLocaleAlternates } from "@/components/portal/locale-alternates";
import { pageHref } from "@/lib/locale-hrefs";
import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";
import { isEmptyHtml } from "@/lib/html";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ locale: string; slug: string }>;
};

function getPageTemplate(page: {
  template?: string | null;
}): "default" | "gallery" {
  return page.template === "gallery" ? "gallery" : "default";
}

function getGalleryImages(page: {
  galleryItems?: Array<{
    mediaId?: string;
    url?: string;
    alt?: string;
    originalName?: string;
  }> | null;
}) {
  if (!Array.isArray(page.galleryItems)) return [];
  return page.galleryItems
    .filter((item) => item?.url)
    .map((item, index) => ({
      id: String(item.mediaId || item.url || index),
      url: String(item.url),
      alt: String(item.alt || item.originalName || ""),
    }));
}

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
  const galleryImages = getGalleryImages(page);
  const ogImage = galleryImages[0]?.url;

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
      images: ogImage ? [ogImage] : undefined,
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

  const vi = getPageLocale(page, "vi");
  const en = getPageLocale(page, "en");
  const template = getPageTemplate(page);
  const galleryImages = getGalleryImages(page);
  const hasIntro = !isEmptyHtml(content.content);

  if (template === "gallery") {
    return (
      <>
        <SetLocaleAlternates
          vi={vi.slug ? pageHref(vi.slug) : null}
          en={en.slug ? pageHref(en.slug) : null}
        />
        {/* Intro stays available for SEO/crawlers; theatre UI covers the viewport. */}
        {hasIntro ? (
          <div className="sr-only">
            <HtmlContent html={content.content} />
          </div>
        ) : null}
        <GalleryPageView images={galleryImages} title={content.title} />
      </>
    );
  }

  return (
    <article className="mx-auto w-full max-w-6xl px-4 py-14 md:px-6">
      <SetLocaleAlternates
        vi={vi.slug ? pageHref(vi.slug) : null}
        en={en.slug ? pageHref(en.slug) : null}
      />
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
