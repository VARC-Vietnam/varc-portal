import { notFound } from "next/navigation";
import { NextIntlClientProvider, hasLocale } from "next-intl";
import { getMessages, setRequestLocale } from "next-intl/server";
import { routing, type AppLocale } from "@/i18n/routing";
import { listNavPages } from "@/lib/cms";
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

export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) {
    notFound();
  }

  setRequestLocale(locale);
  const messages = await getMessages();
  const navPages = await listNavPages(locale as AppLocale);

  return (
    <NextIntlClientProvider messages={messages}>
      <div className="flex min-h-[100dvh] flex-col">
        <SiteHeader navPages={navPages} />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </div>
    </NextIntlClientProvider>
  );
}
