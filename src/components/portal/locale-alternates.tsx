"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { AppLocale } from "@/i18n/routing";

export type LocaleHref =
  | "/"
  | {
      pathname: "/news/[slug]" | "/pages/[slug]";
      params: { slug: string };
    };

type Alternates = Partial<Record<AppLocale, LocaleHref>>;

type LocaleAlternatesContextValue = {
  alternates: Alternates | null;
  setAlternates: (value: Alternates | null) => void;
};

const LocaleAlternatesContext =
  createContext<LocaleAlternatesContextValue | null>(null);

export function LocaleAlternatesProvider({ children }: { children: ReactNode }) {
  const [alternates, setAlternatesState] = useState<Alternates | null>(null);
  const setAlternates = useCallback((value: Alternates | null) => {
    setAlternatesState(value);
  }, []);

  const value = useMemo(
    () => ({ alternates, setAlternates }),
    [alternates, setAlternates],
  );

  return (
    <LocaleAlternatesContext.Provider value={value}>
      {children}
    </LocaleAlternatesContext.Provider>
  );
}

export function useLocaleAlternates() {
  return useContext(LocaleAlternatesContext)?.alternates ?? null;
}

/** Register localized hrefs for the language switcher (pages / articles). */
export function SetLocaleAlternates({
  vi,
  en,
}: {
  vi?: LocaleHref | null;
  en?: LocaleHref | null;
}) {
  const setAlternates = useContext(LocaleAlternatesContext)?.setAlternates;
  const viSlug =
    vi && typeof vi === "object" ? vi.params.slug : vi ? "home" : "";
  const enSlug =
    en && typeof en === "object" ? en.params.slug : en ? "home" : "";

  useEffect(() => {
    if (!setAlternates) return;
    const next: Alternates = {};
    if (vi) next.vi = vi;
    if (en) next.en = en;
    setAlternates(Object.keys(next).length ? next : null);
    return () => setAlternates(null);
  }, [setAlternates, vi, en, viSlug, enSlug]);

  return null;
}

export function pageHref(slug: string): LocaleHref {
  return { pathname: "/pages/[slug]", params: { slug } };
}

export function newsHref(slug: string): LocaleHref {
  return { pathname: "/news/[slug]", params: { slug } };
}
