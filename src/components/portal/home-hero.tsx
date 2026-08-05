type Props = {
  siteName: string;
  siteTitle: string;
  tagline: string;
};

export function HomeHero({ siteName, siteTitle, tagline }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-border">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_12%_0%,#d8ebe1_0%,transparent_42%),radial-gradient(ellipse_at_88%_18%,#e4f0ea_0%,transparent_38%),linear-gradient(180deg,#f7faf8_0%,#eef3f0_55%,#e8efea_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border to-transparent"
      />
      <div className="relative mx-auto flex min-h-[36dvh] max-w-6xl flex-col justify-end px-4 pb-12 pt-20 md:min-h-[40dvh] md:px-6 md:pb-14">
        <p className="font-display text-4xl tracking-tight text-accent md:text-6xl">
          {siteName}
        </p>
        <h1 className="mt-4 max-w-2xl font-display text-2xl leading-[1.15] text-foreground md:mt-5 md:text-4xl">
          {siteTitle}
        </h1>
        <p className="mt-3 max-w-[38ch] text-base leading-relaxed text-muted md:mt-4">
          {tagline}
        </p>
      </div>
    </section>
  );
}
