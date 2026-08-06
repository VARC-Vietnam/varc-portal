"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  CloneIcon,
  EditIcon,
  TrashIcon,
} from "@/components/admin/admin-action-icons";
import {
  IconActionButton,
  IconActionLink,
  RowActionsGroup,
} from "@/components/admin/icon-action-button";
import { useConfirm } from "@/components/admin/use-confirm";
import { notifyAction } from "@/components/admin/admin-toast";

type Props = {
  editHref: string;
  editLabel?: string;
  cloneAction?: () => Promise<
    { ok: true; id: string } | { ok: false; error: string }
  >;
  cloneLabel?: string;
  cloneSuccessHref?: (id: string) => string;
  deleteAction?: () => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteLabel?: string;
  deleteConfirmTitle?: string;
  deleteConfirmMessage?: string;
};

export function ActiveRowActions({
  editHref,
  editLabel = "Edit",
  cloneAction,
  cloneLabel = "Clone",
  cloneSuccessHref = (id) => `/admin/articles/${id}`,
  deleteAction,
  deleteLabel = "Move to trash",
  deleteConfirmTitle = "Move to trash",
  deleteConfirmMessage = "Move this item to trash?",
}: Props) {
  const router = useRouter();
  const { ask, modal } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <RowActionsGroup error={error}>
        <IconActionLink href={editHref} label={editLabel}>
          <EditIcon />
        </IconActionLink>
        {cloneAction ? (
          <IconActionButton
            label={cloneLabel}
            disabled={pending}
            onClick={() => {
              setError(null);
              startTransition(async () => {
                const result = await cloneAction();
                if (!notifyAction(result, "Article cloned as draft")) {
                  setError(result.error);
                  return;
                }
                router.push(cloneSuccessHref(result.id));
                router.refresh();
              });
            }}
          >
            <CloneIcon />
          </IconActionButton>
        ) : null}
        {deleteAction ? (
          <IconActionButton
            label={deleteLabel}
            variant="danger"
            disabled={pending}
            onClick={async () => {
              const confirmed = await ask({
                title: deleteConfirmTitle,
                message: deleteConfirmMessage,
                confirmLabel: "Move to trash",
                variant: "danger",
              });
              if (!confirmed) return;
              setError(null);
              startTransition(async () => {
                const result = await deleteAction();
                if (!notifyAction(result, "Moved to trash")) {
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
      {modal}
    </>
  );
}
