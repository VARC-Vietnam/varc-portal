"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveRoleAction } from "@/lib/actions";
import type { PublicRole } from "@/lib/app-roles";

type Props = {
  roles: PublicRole[];
};

function capabilityBadges(role: PublicRole) {
  const items: string[] = [];
  if (role.canAccessAdmin) items.push("Admin");
  if (role.canManageContent) items.push("Content");
  if (role.canManageUsers) items.push("Users");
  if (role.canManageRoles) items.push("Roles");
  return items;
}

export function RolesBoard({ roles }: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = roles.find((role) => role.id === selectedId) ?? null;

  return (
    <>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {roles.map((role) => {
          const badges = capabilityBadges(role);
          return (
            <button
              key={role.id}
              type="button"
              onClick={() => setSelectedId(role.id)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-5 text-left shadow-sm transition hover:border-gray-400 hover:shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gray-900"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
                    {role.key}
                    {role.isSystem ? " · built-in" : ""}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold text-gray-900">
                    {role.label}
                  </h2>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    role.enabled
                      ? "bg-emerald-50 text-emerald-800"
                      : "bg-gray-100 text-gray-500"
                  }`}
                >
                  {role.enabled ? "Enabled" : "Disabled"}
                </span>
              </div>

              <p className="mt-3 line-clamp-2 text-sm text-gray-600">
                {role.description || "No description"}
              </p>

              {badges.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {badges.map((badge) => (
                    <span
                      key={badge}
                      className="rounded bg-gray-100 px-2 py-0.5 text-[11px] text-gray-700"
                    >
                      {badge}
                    </span>
                  ))}
                </div>
              ) : null}

              <p className="mt-4 text-xs font-medium text-gray-500">
                Click to edit
              </p>
            </button>
          );
        })}
      </div>

      {selected ? (
        <RoleEditModal
          key={selected.id}
          role={selected}
          onClose={() => setSelectedId(null)}
        />
      ) : null}
    </>
  );
}

function RoleEditModal({
  role,
  onClose,
}: {
  role: PublicRole;
  onClose: () => void;
}) {
  const router = useRouter();
  const titleId = useId();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [label, setLabel] = useState(role.label);
  const [description, setDescription] = useState(role.description);
  const [enabled, setEnabled] = useState(role.enabled);
  const lockedEnable = role.key === "setup_admin";

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-medium tracking-wide text-gray-500 uppercase">
              {role.key}
              {role.isSystem ? " · built-in" : ""}
            </p>
            <h2 id={titleId} className="mt-1 text-xl font-semibold text-gray-900">
              Edit role
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border border-gray-200 px-2 py-1 text-sm text-gray-600 hover:bg-gray-50"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {error ? (
          <p className="mt-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="mt-5 grid gap-3">
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Display name</span>
            <input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
              autoFocus
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
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
          <p className="text-xs text-gray-500">
            Capability flags (Admin, Content, Users, Roles) are fixed for
            built-in system roles.
          </p>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={pending}
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
                onClose();
              });
            }}
            className="cursor-pointer rounded bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
