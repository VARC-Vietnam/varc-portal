"use client";

import { useState } from "react";

type Props = {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
};

function normalizeTag(raw: string) {
  return raw.trim().replace(/\s+/g, " ");
}

function addTags(existing: string[], incoming: string[]) {
  const next = [...existing];
  const seen = new Set(existing.map((tag) => tag.toLowerCase()));

  for (const raw of incoming) {
    const tag = normalizeTag(raw);
    if (!tag) continue;
    const key = tag.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    next.push(tag);
  }

  return next;
}

export function TagsInput({
  value,
  onChange,
  placeholder = "Type a tag and press Enter",
}: Props) {
  const [draft, setDraft] = useState("");

  function commitDraft() {
    const parts = draft.split(/[,;]+/);
    const next = addTags(value, parts);
    if (next.length !== value.length) onChange(next);
    setDraft("");
  }

  function removeTag(tag: string) {
    onChange(value.filter((item) => item !== tag));
  }

  return (
    <div>
      <div className="flex min-h-11 flex-wrap items-center gap-2 rounded border border-gray-300 bg-white px-2.5 py-2 focus-within:border-gray-900">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white"
          >
            {tag}
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="rounded px-0.5 text-white/70 hover:bg-white/15 hover:text-white"
              aria-label={`Remove ${tag}`}
            >
              ×
            </button>
          </span>
        ))}
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commitDraft();
              return;
            }
            if (e.key === "Backspace" && !draft && value.length > 0) {
              e.preventDefault();
              onChange(value.slice(0, -1));
            }
          }}
          onBlur={() => {
            if (draft.trim()) commitDraft();
          }}
          placeholder={value.length === 0 ? placeholder : "Add another…"}
          className="min-w-[10rem] flex-1 border-0 bg-transparent py-0.5 text-sm outline-none placeholder:text-gray-400"
        />
      </div>
      <p className="mt-1.5 text-xs text-gray-500">
        Press Enter or comma to add. Backspace removes the last tag.
      </p>
    </div>
  );
}
