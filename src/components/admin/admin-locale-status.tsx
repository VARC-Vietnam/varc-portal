type ChipProps = {
  code: "VI" | "EN";
  ready: boolean;
};

function LocaleChip({ code, ready }: ChipProps) {
  return (
    <span
      title={
        ready
          ? `${code} content is ready`
          : `${code} content is missing`
      }
      className={`inline-flex items-center gap-1 text-xs font-semibold tracking-wide ${
        ready ? "text-lime-600" : "text-gray-400"
      }`}
    >
      <span>{code}</span>
      <span aria-hidden className="font-normal">
        {ready ? "✓" : "—"}
      </span>
      <span className="sr-only">{ready ? "ready" : "missing"}</span>
    </span>
  );
}

type Props = {
  viReady: boolean;
  enReady: boolean;
};

/** Compact VI/EN readiness for admin list tables. */
export function AdminLocaleStatus({ viReady, enReady }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <LocaleChip code="VI" ready={viReady} />
      <LocaleChip code="EN" ready={enReady} />
    </div>
  );
}
