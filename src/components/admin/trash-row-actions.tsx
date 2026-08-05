"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { DeleteForeverIcon, RestoreIcon } from "@/components/admin/admin-action-icons";
import { IconActionButton, RowActionsGroup } from "@/components/admin/icon-action-button";
import { useConfirm } from "@/components/admin/use-confirm";
import { notifyAction } from "@/components/admin/admin-toast";

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
  const { ask, modal } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <RowActionsGroup error={error}>
        <IconActionButton
          label="Restore"
          variant="success"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const result = await restoreAction();
              if (!notifyAction(result, "Restored successfully")) {
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
          onClick={async () => {
            const confirmed = await ask({
              title: "Delete permanently",
              message: `Permanently delete ${itemLabel}? This cannot be undone.`,
              confirmLabel: "Delete permanently",
              variant: "danger",
            });
            if (!confirmed) return;
            setError(null);
            startTransition(async () => {
              const result = await deleteAction();
              if (!notifyAction(result, "Deleted permanently")) {
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
      {modal}
    </>
  );
}
