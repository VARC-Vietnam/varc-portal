import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  localePrefix: "as-needed",
  localeDetection: false,
  pathnames: {
    "/": "/",
    "/news/[slug]": {
      vi: "/tin-tuc/[slug]",
      en: "/news/[slug]",
    },
    "/pages/[slug]": {
      vi: "/trang/[slug]",
      en: "/pages/[slug]",
    },
  },
});

export type AppLocale = (typeof routing.locales)[number];
