import Link from "next/link";
import type { ReactNode } from "react";

const baseClass =
  "inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded border transition disabled:cursor-not-allowed disabled:opacity-40";

const variants = {
  default: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50",
  danger: "border-red-200 bg-white text-red-700 hover:bg-red-50",
  success: "border-emerald-200 bg-white text-emerald-700 hover:bg-emerald-50",
};

type IconActionButtonProps = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  variant?: keyof typeof variants;
  children: ReactNode;
};

export function IconActionButton({
  label,
  onClick,
  disabled,
  variant = "default",
  children,
}: IconActionButtonProps) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={`${baseClass} ${variants[variant]}`}
    >
      {children}
    </button>
  );
}

type IconActionLinkProps = {
  href: string;
  label: string;
  children: ReactNode;
};

export function IconActionLink({ href, label, children }: IconActionLinkProps) {
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={`${baseClass} ${variants.default}`}
    >
      {children}
    </Link>
  );
}

export function RowActionsGroup({
  error,
  children,
}: {
  error?: string | null;
  children: ReactNode;
}) {
  return (
    <div className="inline-flex flex-col items-end gap-1">
      <div className="flex items-center justify-end gap-1.5">{children}</div>
      {error ? <p className="max-w-[12rem] text-right text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
