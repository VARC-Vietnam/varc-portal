"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type Props = {
  label?: string;
  restoreAction: () => Promise<{ ok: true } | { ok: false; error: string }>;
};

export function RestoreButton({ label = "Restore", restoreAction }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        disabled={pending || undefined}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await restoreAction();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="rounded border border-gray-300 bg-white px-2.5 py-1 text-xs font-medium text-gray-800 hover:bg-gray-50 disabled:opacity-50"
      >
        {pending ? "Restoring…" : label}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
