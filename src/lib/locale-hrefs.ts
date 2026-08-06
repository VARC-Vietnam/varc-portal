export type LocaleHref =
  | "/"
  | {
      pathname: "/news/[slug]" | "/pages/[slug]" | "/categories/[slug]";
      params: { slug: string };
    };

export function pageHref(slug: string): LocaleHref {
  return { pathname: "/pages/[slug]", params: { slug } };
}

export function newsHref(slug: string): LocaleHref {
  return { pathname: "/news/[slug]", params: { slug } };
}

export function categoryHref(slug: string): LocaleHref {
  return { pathname: "/categories/[slug]", params: { slug } };
}
