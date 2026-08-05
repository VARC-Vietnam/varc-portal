"use client";

import { useEffect, useId, useRef, useState } from "react";
import { AdminCheckbox } from "@/components/admin/admin-checkbox";

type Option = { id: string; label: string };

type Props = {
  options: Option[];
  value: string[];
  onChange: (ids: string[]) => void;
  placeholder?: string;
  emptyLabel?: string;
};

export function CategoryCheckboxDropdown({
  options,
  value,
  onChange,
  placeholder = "Select categories",
  emptyLabel = "No categories yet",
}: Props) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);

  const selected = options.filter((option) => value.includes(option.id));
  const summary =
    selected.length === 0
      ? placeholder
      : selected.length <= 2
        ? selected.map((option) => option.label).join(", ")
        : `${selected.length} selected`;

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function toggle(id: string) {
    if (value.includes(id)) {
      onChange(value.filter((item) => item !== id));
      return;
    }
    onChange([...value, id]);
  }

  if (options.length === 0) {
    return (
      <p className="rounded-md border border-dashed border-gray-300 bg-white px-3 py-2 text-sm text-gray-500">
        {emptyLabel}
      </p>
    );
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full min-w-0 cursor-pointer items-center gap-2 rounded-md border border-gray-300 bg-white px-3 py-2 text-left text-sm hover:bg-gray-50"
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            selected.length === 0 ? "text-gray-500" : "text-gray-900"
          }`}
        >
          {summary}
        </span>
        <svg
          viewBox="0 0 24 24"
          className={`h-4 w-4 shrink-0 text-gray-500 transition ${
            open ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="m6 10 6 6 6-6" />
        </svg>
      </button>

      {open ? (
        <div
          id={listId}
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-30 mt-1 max-h-56 w-full min-w-0 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {options.map((option) => {
            const checked = value.includes(option.id);
            return (
              <label
                key={option.id}
                role="option"
                aria-selected={checked}
                className="flex cursor-pointer items-start gap-2.5 px-3 py-2 text-sm text-gray-800 hover:bg-gray-50"
              >
                <AdminCheckbox
                  className="mt-0.5"
                  checked={checked}
                  onChange={() => toggle(option.id)}
                />
                <span className="min-w-0 break-words">{option.label}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {selected.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selected.map((option) => (
            <span
              key={option.id}
              className="inline-flex max-w-full items-center gap-1 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white"
            >
              <span className="min-w-0 truncate">{option.label}</span>
              <button
                type="button"
                aria-label={`Remove ${option.label}`}
                onClick={() => toggle(option.id)}
                className="shrink-0 rounded text-white/80 hover:text-white"
              >
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
