import { getTranslations } from "next-intl/server";
import { LanguageSwitcher } from "@/components/portal/language-switcher";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const tSite = await getTranslations("site");

  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-10 text-sm text-muted md:px-6">
        <div className="flex flex-col gap-2">
          <p className="font-display text-base text-foreground">{tSite("name")}</p>
          <p>{t("rights")}</p>
        </div>
        <LanguageSwitcher />
      </div>
    </footer>
  );
}
