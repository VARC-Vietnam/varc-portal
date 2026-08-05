import { getTranslations, setRequestLocale } from "next-intl/server";
import {
  listFeaturedArticles,
  listPublishedArticles,
} from "@/lib/articles";
import { getPublicSiteBranding } from "@/lib/cms";
import type { AppLocale } from "@/i18n/routing";
import { HomeFeaturedSlider } from "@/components/portal/home-featured-slider";
import { HomeLatestSpotlight } from "@/components/portal/home-latest-spotlight";
import { HomeLatest } from "@/components/portal/home-latest";
import { HomeHero } from "@/components/portal/home-hero";

export const dynamic = "force-dynamic";

const FEATURED_SLIDE_LIMIT = 3;
const SPOTLIGHT_COUNT = 4;
const GRID_COUNT = 9;

type Props = {
  params: Promise<{ locale: string }>;
};

export default async function HomePage({ params }: Props) {
  const { locale: localeParam } = await params;
  const locale = localeParam as AppLocale;
  setRequestLocale(locale);

  const t = await getTranslations("home");
  const [branding, featured] = await Promise.all([
    getPublicSiteBranding(locale),
    listFeaturedArticles(locale, FEATURED_SLIDE_LIMIT),
  ]);

  // Only hide the hero slides from sections below; older featured posts still appear.
  const heroFeaturedIds = featured.map((article) => article.id);
  const { articles: remaining } = await listPublishedArticles(
    locale,
    1,
    SPOTLIGHT_COUNT + GRID_COUNT,
    { excludeIds: heroFeaturedIds },
  );

  const spotlight = remaining.slice(0, SPOTLIGHT_COUNT);
  const grid = remaining.slice(SPOTLIGHT_COUNT);

  const sharedLabels = {
    readMore: t("readMore"),
    publishedAt: t("publishedAt"),
  };

  if (featured.length === 0 && remaining.length === 0) {
    return (
      <div>
        <HomeHero
          siteName={branding.siteName}
          siteTitle={branding.siteTitle}
          tagline={branding.tagline}
        />
        <HomeLatest
          articles={[]}
          locale={locale}
          labels={{
            title: t("title"),
            empty: t("empty"),
            ...sharedLabels,
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {featured.length > 0 ? (
        <HomeFeaturedSlider
          articles={featured}
          locale={locale}
          siteName={branding.siteName}
          labels={{
            featuredLabel: t("featuredLabel"),
            previous: t("previousSlide"),
            next: t("nextSlide"),
            ...sharedLabels,
          }}
        />
      ) : (
        <HomeHero
          siteName={branding.siteName}
          siteTitle={branding.siteTitle}
          tagline={branding.tagline}
        />
      )}

      <HomeLatestSpotlight
        articles={spotlight}
        locale={locale}
        labels={{
          title: t("title"),
          ...sharedLabels,
        }}
      />

      {grid.length > 0 ? (
        <HomeLatest
          articles={grid}
          locale={locale}
          labels={{
            title: t("moreTitle"),
            empty: t("empty"),
            ...sharedLabels,
          }}
        />
      ) : null}
    </div>
  );
}
