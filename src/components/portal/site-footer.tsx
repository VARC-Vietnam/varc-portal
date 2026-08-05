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
        <div className="grid grid-cols-1 gap-8 md:grid-cols-6 md:items-start md:gap-6">
          <div className="flex flex-col gap-2 md:col-span-2">
            <p className="font-display text-base text-foreground">
              {branding.siteName}
            </p>
            <p>{branding.copyright}</p>
          </div>

          <nav
            aria-label={t("menu")}
            className="md:col-span-3"
          >
            {menuItems.length > 0 ? (
              <FooterMenuLinks items={menuItems} columns={3} />
            ) : null}
          </nav>

          <div className="md:col-span-1 md:justify-self-end">
            <LanguageSwitcher align="end" />
          </div>
        </div>
      </div>
    </footer>
  );
}
