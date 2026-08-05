"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditIcon, TrashIcon } from "@/components/admin/admin-action-icons";
import {
  IconActionButton,
  IconActionLink,
  RowActionsGroup,
} from "@/components/admin/icon-action-button";

type Props = {
  editHref: string;
  editLabel?: string;
  deleteAction?: () => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteLabel?: string;
  deleteConfirmMessage?: string;
};

export function ActiveRowActions({
  editHref,
  editLabel = "Edit",
  deleteAction,
  deleteLabel = "Move to trash",
  deleteConfirmMessage = "Move this item to trash?",
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <RowActionsGroup error={error}>
      <IconActionLink href={editHref} label={editLabel}>
        <EditIcon />
      </IconActionLink>
      {deleteAction ? (
        <IconActionButton
          label={deleteLabel}
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (!confirm(deleteConfirmMessage)) return;
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
          <TrashIcon />
        </IconActionButton>
      ) : null}
    </RowActionsGroup>
  );
}
