"use client";

import { Toaster, toast } from "sonner";

export function AdminToaster() {
  return (
    <Toaster
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast: "font-sans",
        },
      }}
    />
  );
}

type ActionFailure = { ok: false; error: string };
type ActionSuccess<T extends Record<string, unknown> = Record<string, unknown>> =
  { ok: true } & T;
type ActionResult<T extends Record<string, unknown> = Record<string, unknown>> =
  | ActionSuccess<T>
  | ActionFailure;

export function notifyAction<T extends Record<string, unknown>>(
  result: ActionResult<T>,
  successMessage: string,
): result is ActionSuccess<T> {
  if (result.ok) {
    toast.success(successMessage);
    return true;
  }
  toast.error(result.error || "Something went wrong");
  return false;
}

export function notifySuccess(message: string) {
  toast.success(message);
}

export function notifyError(message: string) {
  toast.error(message || "Something went wrong");
}
