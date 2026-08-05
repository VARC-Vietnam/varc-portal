"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DeleteForeverIcon, RestoreIcon } from "@/components/admin/admin-action-icons";
import { IconActionButton, RowActionsGroup } from "@/components/admin/icon-action-button";

type Props = {
  restoreAction: () => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteAction: () => Promise<{ ok: true } | { ok: false; error: string }>;
  itemLabel?: string;
};

export function TrashRowActions({
  restoreAction,
  deleteAction,
  itemLabel = "this item",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <RowActionsGroup error={error}>
      <IconActionButton
        label="Restore"
        variant="success"
        disabled={pending}
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
      >
        <RestoreIcon />
      </IconActionButton>
      <IconActionButton
        label="Delete permanently"
        variant="danger"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              `Permanently delete ${itemLabel}? This cannot be undone.`,
            )
          ) {
            return;
          }
          setError(null);
          startTransition(async () => {
            const result = await deleteAction();
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <DeleteForeverIcon />
      </IconActionButton>
    </RowActionsGroup>
  );
}
