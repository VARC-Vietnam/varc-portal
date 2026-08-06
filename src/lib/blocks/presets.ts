import {
  createBlock,
  createSection,
  emptyLayout,
  type TemplateLayout,
} from "@/lib/blocks/types";

export function homeTemplateLayout(): TemplateLayout {
  return {
    sections: [
      createSection([
        createBlock("featuredSlider", {
          settings: { limit: 3 },
        }),
      ]),
      createSection([
        createBlock("heading", {
          source: {
            text: "Latest news",
            locales: {
              vi: { text: "Tin mới nhất" },
              en: { text: "Latest news" },
            },
          },
          settings: { level: 2 },
        }),
      ]),
      createSection([
        createBlock("articleList", {
          source: { mode: "latest" },
          settings: { limit: 4, variant: "spotlight" },
          colSpan: { mobile: 12, tablet: 12, desktop: 12 },
        }),
      ]),
    ],
  };
}

export function articleTemplateLayout(): TemplateLayout {
  return {
    sections: [
      createSection([
        createBlock("heading", {
          source: { text: "{{page.title}}" },
          settings: { level: 1, bindPageTitle: true },
        }),
      ]),
      createSection([
        createBlock("pageContent"),
      ]),
    ],
  };
}

export function categoryTemplateLayout(): TemplateLayout {
  return {
    sections: [
      createSection([
        createBlock("heading", {
          source: { text: "Category" },
          settings: { level: 1, bindPageTitle: true },
        }),
      ]),
      createSection([
        createBlock("articleList", {
          source: { mode: "category" },
          settings: { limit: 12, variant: "grid" },
        }),
      ]),
    ],
  };
}

export function blankTemplateLayout(): TemplateLayout {
  return emptyLayout();
}

export function customTemplateLayout(): TemplateLayout {
  return {
    sections: [
      createSection([
        createBlock("heading", {
          source: { text: "{{page.title}}" },
          settings: { level: 1, bindPageTitle: true },
        }),
      ]),
      createSection([
        createBlock("pageContent"),
      ]),
    ],
  };
}

export function galleryTemplateLayout(): TemplateLayout {
  return {
    sections: [
      createSection([
        createBlock("gallery", {
          source: { galleryItems: [] },
          settings: { usePageGallery: true },
        }),
      ]),
    ],
  };
}

export const SYSTEM_TEMPLATE_SEEDS = [
  {
    key: "home" as const,
    name: "Home Page",
    description: "Featured slider and latest articles layout.",
    layout: homeTemplateLayout(),
  },
  {
    key: "article" as const,
    name: "Article Page",
    description: "Title and page body content.",
    layout: articleTemplateLayout(),
  },
  {
    key: "category" as const,
    name: "Category Page",
    description: "Category heading with article list.",
    layout: categoryTemplateLayout(),
  },
  {
    key: "blank" as const,
    name: "Blank Page",
    description: "Empty canvas — add your own blocks.",
    layout: blankTemplateLayout(),
  },
  {
    key: "custom" as const,
    name: "Custom Page",
    description: "Title plus rich-text body (legacy default pages).",
    layout: customTemplateLayout(),
  },
  {
    key: "gallery" as const,
    name: "Gallery Page",
    description: "Fullscreen image gallery theatre.",
    layout: galleryTemplateLayout(),
  },
];
