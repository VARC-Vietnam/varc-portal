import { ArticleCard } from "@/components/portal/article-card";
import { GalleryPageView } from "@/components/portal/gallery-page-view";
import { HomeFeaturedSlider } from "@/components/portal/home-featured-slider";
import { HomeLatestSpotlight } from "@/components/portal/home-latest-spotlight";
import { HtmlContent } from "@/components/portal/html-content";
import { MenuBlockNav } from "@/components/portal/menu-block-nav";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import type { ResolvedBlockData } from "@/lib/blocks/resolve";
import {
  settingBool,
  settingNumber,
  settingString,
} from "@/lib/blocks/resolve";
import {
  resolveBlockLocaleText,
  type TemplateBlock,
  type TemplateLayout,
} from "@/lib/blocks/types";

type Labels = {
  readMore: string;
  publishedAt: string;
  featuredLabel?: string;
  latestTitle?: string;
  previous?: string;
  next?: string;
};

type Props = {
  layout: TemplateLayout;
  resolved: Map<string, ResolvedBlockData>;
  locale: AppLocale;
  labels: Labels;
  siteName?: string;
  /** When true, gallery blocks use the theatre fullscreen view. */
  theatreGallery?: boolean;
  pageTitle?: string;
};

const COL_MOBILE: Record<number, string> = {
  1: "col-span-1",
  2: "col-span-2",
  3: "col-span-3",
  4: "col-span-4",
  5: "col-span-5",
  6: "col-span-6",
  7: "col-span-7",
  8: "col-span-8",
  9: "col-span-9",
  10: "col-span-10",
  11: "col-span-11",
  12: "col-span-12",
};

const COL_TABLET: Record<number, string> = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  7: "md:col-span-7",
  8: "md:col-span-8",
  9: "md:col-span-9",
  10: "md:col-span-10",
  11: "md:col-span-11",
  12: "md:col-span-12",
};

const COL_DESKTOP: Record<number, string> = {
  1: "lg:col-span-1",
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  11: "lg:col-span-11",
  12: "lg:col-span-12",
};

const ALIGN: Record<string, string> = {
  start: "justify-self-start text-left",
  center: "justify-self-center text-center",
  end: "justify-self-end text-right",
  stretch: "justify-self-stretch",
};

function spanClass(block: TemplateBlock) {
  const m = Math.min(12, Math.max(1, block.colSpan.mobile));
  const t = Math.min(12, Math.max(1, block.colSpan.tablet));
  const d = Math.min(12, Math.max(1, block.colSpan.desktop));
  return `${COL_MOBILE[m]} ${COL_TABLET[t]} ${COL_DESKTOP[d]} ${ALIGN[block.align] ?? ALIGN.stretch}`;
}

function BlockView({
  block,
  data,
  locale,
  labels,
  siteName,
  theatreGallery,
  pageTitle,
}: {
  block: TemplateBlock;
  data: ResolvedBlockData;
  locale: AppLocale;
  labels: Labels;
  siteName?: string;
  theatreGallery?: boolean;
  pageTitle?: string;
}) {
  const cardLabels = {
    readMore: labels.readMore,
    publishedAt: labels.publishedAt,
  };

  switch (block.type) {
    case "heading": {
      const level = Math.min(
        4,
        Math.max(1, settingNumber(block.settings, "level", 2)),
      );
      const Tag = (`h${level}` as "h1" | "h2" | "h3" | "h4");
      const text = data.text || "";
      if (!text) return null;
      const className =
        level === 1
          ? "font-display text-4xl leading-tight text-foreground md:text-5xl"
          : level === 2
            ? "font-display text-2xl text-foreground md:text-3xl"
            : "font-display text-xl text-foreground";
      if (data.href) {
        return (
          <Tag className={className}>
            <a href={data.href} className="hover:underline">
              {text}
            </a>
          </Tag>
        );
      }
      return <Tag className={className}>{text}</Tag>;
    }
    case "richText":
    case "pageContent":
    case "html":
      return data.html ? <HtmlContent html={data.html} /> : null;
    case "image":
      if (!data.imageUrl) return null;
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={data.imageUrl}
          alt={data.imageAlt || ""}
          className="h-auto w-full max-w-full"
        />
      );
    case "gallery": {
      const images = data.galleryItems ?? [];
      if (!images.length) return null;
      if (theatreGallery) {
        return (
          <GalleryPageView images={images} title={pageTitle || "Gallery"} />
        );
      }
      return (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {images.map((img) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={img.id}
              src={img.url}
              alt={img.alt}
              className="aspect-[4/3] w-full object-cover"
            />
          ))}
        </div>
      );
    }
    case "featuredSlider":
      if (!data.articles?.length) return null;
      return (
        <HomeFeaturedSlider
          articles={data.articles}
          locale={locale}
          siteName={siteName || ""}
          labels={{
            featuredLabel: labels.featuredLabel || "Featured",
            readMore: labels.readMore,
            publishedAt: labels.publishedAt,
            previous: labels.previous || "Previous",
            next: labels.next || "Next",
          }}
        />
      );
    case "articleList": {
      const articles = data.articles ?? [];
      if (!articles.length) return null;
      const variant = settingString(block.settings, "variant") || "grid";
      const showTitle = settingBool(block.settings, "showTitle");
      const contentLocale = locale === "en" ? "en" : "vi";
      const localizedTitle =
        data.sectionTitle ||
        resolveBlockLocaleText(block.source, contentLocale).text;
      const listTitle = showTitle
        ? localizedTitle || labels.latestTitle || ""
        : "";

      if (variant === "spotlight") {
        return (
          <HomeLatestSpotlight
            articles={articles}
            locale={locale}
            labels={{
              title: listTitle,
              readMore: labels.readMore,
              publishedAt: labels.publishedAt,
            }}
          />
        );
      }

      return (
        <div className="space-y-6">
          {listTitle ? (
            <h2 className="font-display text-2xl text-foreground md:text-3xl">
              {listTitle}
            </h2>
          ) : null}
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => (
              <ArticleCard
                key={article.id}
                article={article}
                locale={locale}
                variant="grid"
                labels={cardLabels}
              />
            ))}
          </div>
        </div>
      );
    }
    case "articleCard":
      if (!data.article) return null;
      return (
        <ArticleCard
          article={data.article}
          locale={locale}
          variant="grid"
          labels={cardLabels}
        />
      );
    case "categoryList":
      if (!data.categories?.length) return null;
      return (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.categories.map((category) => (
            <li key={category.id}>
              <Link
                href={{
                  pathname: "/categories/[slug]",
                  params: { slug: category.slug },
                }}
                className="block border-b border-border pb-3 transition hover:text-accent"
              >
                <span className="font-display text-lg">{category.name}</span>
                {category.description ? (
                  <p className="mt-1 text-sm text-muted">{category.description}</p>
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      );
    case "menu":
      if (!data.menuLinks?.length) return null;
      return <MenuBlockNav items={data.menuLinks} />;
    case "spacer":
      return <div style={{ height: data.spacerHeight ?? 32 }} aria-hidden />;
    default:
      return null;
  }
}

function isFullBleedBlock(block: TemplateBlock): boolean {
  if (block.type === "featuredSlider") return true;
  if (
    block.type === "articleList" &&
    settingString(block.settings, "variant") === "spotlight"
  ) {
    return true;
  }
  return false;
}

function isFullBleedSection(blocks: TemplateBlock[]): boolean {
  return blocks.some(isFullBleedBlock);
}

export function TemplateLayoutRenderer({
  layout,
  resolved,
  locale,
  labels,
  siteName,
  theatreGallery,
  pageTitle,
}: Props) {
  return (
    <div className="w-full">
      {layout.sections.map((section) => {
        const fullBleed = isFullBleedSection(section.blocks);

        if (fullBleed) {
          return (
            <section key={section.id} className="w-full">
              {section.blocks.map((block) => {
                const data = resolved.get(block.id) ?? {};
                // Featured slider / spotlight always span the viewport edge-to-edge.
                return (
                  <div key={block.id} className="w-full">
                    <BlockView
                      block={block}
                      data={data}
                      locale={locale}
                      labels={labels}
                      siteName={siteName}
                      theatreGallery={theatreGallery}
                      pageTitle={pageTitle}
                    />
                  </div>
                );
              })}
            </section>
          );
        }

        return (
          <section
            key={section.id}
            className="mx-auto grid w-full max-w-6xl grid-cols-12 gap-4 px-4 py-6 md:px-6 md:py-8"
          >
            {section.blocks.map((block) => {
              const data = resolved.get(block.id) ?? {};
              return (
                <div key={block.id} className={spanClass(block)}>
                  <BlockView
                    block={block}
                    data={data}
                    locale={locale}
                    labels={labels}
                    siteName={siteName}
                    theatreGallery={theatreGallery}
                    pageTitle={pageTitle}
                  />
                </div>
              );
            })}
          </section>
        );
      })}
    </div>
  );
}
