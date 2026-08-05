"use client";

import { useCallback, useState } from "react";
import { ConfirmModal, type ConfirmModalProps } from "@/components/admin/confirm-modal";

export type ConfirmOptions = Pick<
  ConfirmModalProps,
  "title" | "message" | "confirmLabel" | "cancelLabel" | "variant"
>;

type PendingDialog = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function useConfirm() {
  const [dialog, setDialog] = useState<PendingDialog | null>(null);

  const ask = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialog({ ...options, resolve });
    });
  }, []);

  const close = useCallback((value: boolean) => {
    setDialog((current) => {
      current?.resolve(value);
      return null;
    });
  }, []);

  const modal = dialog ? (
    <ConfirmModal
      open
      title={dialog.title}
      message={dialog.message}
      confirmLabel={dialog.confirmLabel}
      cancelLabel={dialog.cancelLabel}
      variant={dialog.variant}
      onCancel={() => close(false)}
      onConfirm={() => close(true)}
    />
  ) : null;

  return { ask, modal };
}
