import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { routing, type AppLocale } from "@/i18n/routing";
import { getPublicSiteBranding, listPublicMenuLinks } from "@/lib/cms";
import { isAdminRole } from "@/lib/roles";
import { SiteFooter } from "@/components/portal/site-footer";
import { SiteHeader } from "@/components/portal/site-header";

export const dynamic = "force-dynamic";

type Props = {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) return {};

  const branding = await getPublicSiteBranding(locale as AppLocale);
  const siteName = branding.siteName;
  const siteTitle = branding.siteTitle;
  const description = branding.metaDescription || branding.tagline;
  const suffix = `${siteName} | ${siteTitle}`;

  return {
    title: {
      // Home: "{site name} | {site title}"
      default: suffix,
      // Articles/pages: "{page name} - {site name} | {site title}"
      template: `%s - ${suffix}`,
    },
    description,
    icons: branding.faviconUrl
      ? { icon: branding.faviconUrl }
      : undefined,
    openGraph: {
      title: suffix,
      description,
      siteName,
      images: branding.ogImageUrl ? [branding.ogImageUrl] : undefined,
    },
  };
}

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const appLocale = locale as AppLocale;
  const [navItems, footerItems, session, branding] = await Promise.all([
    listPublicMenuLinks("navigation", appLocale),
    listPublicMenuLinks("footer", appLocale),
    auth(),
    getPublicSiteBranding(appLocale),
  ]);

  const user = session?.user
    ? {
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        isAdmin: isAdminRole(session.user.role),
      }
    : null;

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-[100dvh] flex-col">
        <SiteHeader
          menuItems={navItems}
          user={user}
          branding={{
            siteName: branding.siteName,
            logoUrl: branding.logoUrl || undefined,
          }}
        />
        <main className="flex-1">{children}</main>
        <SiteFooter
          menuItems={footerItems}
          branding={{
            siteName: branding.siteName,
            copyright: branding.copyright,
          }}
        />
      </div>
    </NextIntlClientProvider>
  );
}
