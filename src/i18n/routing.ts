import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  locales: ["vi", "en"],
  defaultLocale: "vi",
  // "as-needed" uses NextResponse.rewrite() for the default locale. Next.js 16
  // standalone serves those rewrites as a self-307, which loops forever behind
  // Cloudflare/NPM. Always prefix locales so middleware only redirects/next().
  localePrefix: "always",
  localeDetection: false,
  // Keep typed routes; paths are identical per locale so no rewrite is needed.
  pathnames: {
    "/": "/",
    "/news/[slug]": "/news/[slug]",
    "/pages/[slug]": "/pages/[slug]",
  },
});

export type AppLocale = (typeof routing.locales)[number];
