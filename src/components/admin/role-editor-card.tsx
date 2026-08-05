"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRoleAction } from "@/lib/actions";
import type { PublicRole } from "@/lib/app-roles";

type Props = {
  role: PublicRole;
};

export function RoleEditorCard({ role }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState(role.label);
  const [description, setDescription] = useState(role.description);
  const [enabled, setEnabled] = useState(role.enabled);

  const lockedEnable = role.key === "setup_admin";

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
            {role.key}
            {role.isSystem ? " · built-in" : ""}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-gray-900">{role.label}</h2>
        </div>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {role.canAccessAdmin ? (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">
              Admin
            </span>
          ) : null}
          {role.canManageContent ? (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">
              Content
            </span>
          ) : null}
          {role.canManageUsers ? (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">
              Users
            </span>
          ) : null}
          {role.canManageRoles ? (
            <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-700">
              Roles
            </span>
          ) : null}
        </div>
      </div>

      {error ? (
        <p className="mt-3 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      <div className="mt-4 grid gap-3">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Display name</span>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Description</span>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded border border-gray-300 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            disabled={lockedEnable}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>Enabled for assignment</span>
        </label>
      </div>

      <button
        type="button"
        disabled={pending || undefined}
        onClick={() => {
          setError(null);
          startTransition(async () => {
            const result = await saveRoleAction(role.id, {
              label,
              description,
              enabled,
            });
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
        className="mt-4 rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </div>
  );
}
