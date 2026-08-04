import type { MetadataRoute } from "next";
import { listPublishedForSitemap, getLocaleContent } from "@/lib/articles";
import {
  listPublishedPagesForSitemap,
  getPageLocale,
} from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3099";
  const [articles, pages] = await Promise.all([
    listPublishedForSitemap().catch(() => []),
    listPublishedPagesForSitemap().catch(() => []),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      alternates: { languages: { vi: siteUrl, en: `${siteUrl}/en` } },
    },
    {
      url: `${siteUrl}/en`,
      lastModified: new Date(),
      alternates: { languages: { vi: siteUrl, en: `${siteUrl}/en` } },
    },
  ];

  for (const article of articles) {
    const vi = getLocaleContent(article, "vi");
    const en = getLocaleContent(article, "en");
    const lastModified = article.updatedAt
      ? new Date(article.updatedAt)
      : new Date();

    if (vi.slug) {
      entries.push({
        url: `${siteUrl}/tin-tuc/${vi.slug}`,
        lastModified,
        alternates: {
          languages: {
            vi: `${siteUrl}/tin-tuc/${vi.slug}`,
            ...(en.slug ? { en: `${siteUrl}/en/news/${en.slug}` } : {}),
          },
        },
      });
    }
    if (en.slug) {
      entries.push({
        url: `${siteUrl}/en/news/${en.slug}`,
        lastModified,
        alternates: {
          languages: {
            ...(vi.slug ? { vi: `${siteUrl}/tin-tuc/${vi.slug}` } : {}),
            en: `${siteUrl}/en/news/${en.slug}`,
          },
        },
      });
    }
  }

  for (const page of pages) {
    const vi = getPageLocale(page, "vi");
    const en = getPageLocale(page, "en");
    const lastModified = page.updatedAt
      ? new Date(page.updatedAt)
      : new Date();

    if (vi.slug) {
      entries.push({
        url: `${siteUrl}/trang/${vi.slug}`,
        lastModified,
        alternates: {
          languages: {
            vi: `${siteUrl}/trang/${vi.slug}`,
            ...(en.slug ? { en: `${siteUrl}/en/pages/${en.slug}` } : {}),
          },
        },
      });
    }
    if (en.slug) {
      entries.push({
        url: `${siteUrl}/en/pages/${en.slug}`,
        lastModified,
        alternates: {
          languages: {
            ...(vi.slug ? { vi: `${siteUrl}/trang/${vi.slug}` } : {}),
            en: `${siteUrl}/en/pages/${en.slug}`,
          },
        },
      });
    }
  }

  return entries;
}
