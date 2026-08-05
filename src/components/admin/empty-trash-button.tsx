"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/admin/use-confirm";

type Props = {
  count: number;
  itemLabel: string;
  emptyAction: () => Promise<{ ok: true; deleted: number } | { ok: false; error: string }>;
};

export function EmptyTrashButton({ count, itemLabel, emptyAction }: Props) {
  const router = useRouter();
  const { ask, modal } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (count === 0) return null;

  return (
    <>
      <div className="flex flex-col items-end gap-1">
        <button
          type="button"
          disabled={pending || undefined}
          onClick={async () => {
            const confirmed = await ask({
              title: "Empty trash",
              message: `Permanently delete all ${count} ${itemLabel} in trash? This cannot be undone.`,
              confirmLabel: "Empty trash",
              variant: "danger",
            });
            if (!confirmed) return;
            setError(null);
            startTransition(async () => {
              const result = await emptyAction();
              if (!result.ok) {
                setError(result.error);
                return;
              }
              router.refresh();
            });
          }}
          className="rounded border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {pending ? "Emptying…" : "Empty trash"}
        </button>
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
      </div>
      {modal}
    </>
  );
}
