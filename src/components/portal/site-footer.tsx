import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/portal/language-switcher";
import type { PublicMenuLink } from "@/lib/cms";
import { FooterMenuLinks } from "@/components/portal/footer-menu-links";

export async function SiteFooter({
  menuItems = [],
}: {
  menuItems?: PublicMenuLink[];
}) {
  const t = await getTranslations("footer");
  const tSite = await getTranslations("site");

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted md:px-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-2">
            <p className="font-display text-base text-foreground">
              {tSite("name")}
            </p>
            <p>{t("rights")}</p>
          </div>
          {menuItems.length > 0 ? (
            <nav aria-label={t("menu")} className="flex flex-wrap gap-x-5 gap-y-2">
              <FooterMenuLinks items={menuItems} />
            </nav>
          ) : null}
        </div>
        <LanguageSwitcher />
      </div>
    </footer>
  );
}
