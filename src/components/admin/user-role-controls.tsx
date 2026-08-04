"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUserRoleAction } from "@/lib/actions";
import type { Role } from "@/lib/roles";

type Props = {
  userId: string;
  role: Role;
  disabled?: boolean;
};

export function UserRoleControls({ userId, role, disabled }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <select
        value={role}
        disabled={disabled || pending}
        className="rounded border border-gray-300 px-2 py-1"
        onChange={(e) => {
          const next = e.target.value as Role;
          setError(null);
          startTransition(async () => {
            const result = await updateUserRoleAction(userId, next);
            if (!result.ok) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        <option value="user">user</option>
        <option value="administrator">administrator</option>
        <option value="system_admin">system_admin</option>
      </select>
      {error ? <span className="text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
