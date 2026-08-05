"use client";

import type { InputHTMLAttributes } from "react";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "className"
> & {
  className?: string;
};

export function AdminCheckbox({ className = "", ...props }: Props) {
  return (
    <span
      className={`relative inline-flex h-4 w-4 shrink-0 items-center justify-center ${className}`}
    >
      <input
        type="checkbox"
        className="peer absolute inset-0 z-10 m-0 h-full w-full cursor-pointer appearance-none opacity-0"
        {...props}
      />
      <span
        aria-hidden
        className="pointer-events-none flex h-4 w-4 items-center justify-center rounded border border-gray-300 bg-white text-transparent transition peer-hover:border-gray-400 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gray-900 peer-checked:border-gray-900 peer-checked:bg-gray-900 peer-checked:text-white peer-disabled:opacity-50"
      >
        <svg
          viewBox="0 0 16 16"
          className="h-3 w-3"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.25"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
        </svg>
      </span>
    </span>
  );
}
