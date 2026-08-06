import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/portal/language-switcher";
import type { PublicMenuLink } from "@/lib/cms";
import { FooterMenuLinks } from "@/components/portal/footer-menu-links";

export type SiteFooterBranding = {
  siteName: string;
  copyright: string;
};

export async function SiteFooter({
  menuItems = [],
  branding,
}: {
  menuItems?: PublicMenuLink[];
  branding: SiteFooterBranding;
}) {
  const t = await getTranslations("footer");

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted md:px-6">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between md:gap-8">
          <div className="min-w-0 shrink md:max-w-[40%]">
            <p className="font-display text-base text-foreground">
              {branding.siteName}
            </p>
            <p className="mt-2">{branding.copyright}</p>
          </div>

          <div className="flex w-full min-w-0 flex-col items-stretch gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-end sm:gap-x-5">
            {menuItems.length > 0 ? (
              <nav aria-label={t("menu")} className="min-w-0">
                <FooterMenuLinks items={menuItems} />
              </nav>
            ) : null}
            <div className="shrink-0 sm:pt-0.5">
              <LanguageSwitcher align="end" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
