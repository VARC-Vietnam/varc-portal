"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserRoleAction } from "@/lib/actions";
import type { PublicRole } from "@/lib/app-roles";
import { normalizeRoleKey, type Role } from "@/lib/roles";
import { notifyAction } from "@/components/admin/admin-toast";

type Props = {
  userId: string;
  role: string;
  roles: PublicRole[];
  disabled?: boolean;
};

export function UserRoleControls({ userId, role, roles, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const current = normalizeRoleKey(role);

  return (
    <div className="flex flex-col gap-1">
      <select
        value={current}
        disabled={disabled || pending}
        className="rounded border border-gray-300 px-2 py-1"
        onChange={(e) => {
          const next = e.target.value as Role;
          setError(null);
          startTransition(async () => {
            const result = await updateUserRoleAction(userId, next);
            if (!notifyAction(result, "Role updated")) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {roles.map((item) => (
          <option key={item.key} value={item.key}>
            {item.label}
          </option>
        ))}
      </select>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
