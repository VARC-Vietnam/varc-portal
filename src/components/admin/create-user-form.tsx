"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUserAction } from "@/lib/actions";
import type { PublicRole } from "@/lib/app-roles";
import type { Role } from "@/lib/roles";
import { notifyAction } from "@/components/admin/admin-toast";

type Props = {
  roles: PublicRole[];
};

export function CreateUserForm({ roles }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const defaultRole =
    (roles.find((role) => role.key === "administrator")?.key as Role) ||
    (roles[0]?.key as Role) ||
    "administrator";
  const [role, setRole] = useState<Role>(defaultRole);

  return (
    <form
      className="mt-6 grid gap-3 rounded-lg border border-gray-200 bg-white p-5 md:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        startTransition(async () => {
          const result = await createUserAction({
            name,
            email,
            password,
            role,
          });
          if (!notifyAction(result, "User created")) {
            setError(result.error);
            return;
          }
          setName("");
          setEmail("");
          setPassword("");
          setRole(defaultRole);
          router.refresh();
        });
      }}
    >
      <h2 className="md:col-span-2 text-base font-semibold">Create user</h2>
      {error ? (
        <p className="md:col-span-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Email</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Password</span>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
          className="w-full rounded border border-gray-300 px-3 py-2"
        />
      </label>
      <label className="block text-sm">
        <span className="mb-1 block font-medium">Role</span>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          className="w-full rounded border border-gray-300 px-3 py-2"
        >
          {roles.map((item) => (
            <option key={item.key} value={item.key}>
              {item.label}
            </option>
          ))}
        </select>
      </label>
      <div className="md:col-span-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
        >
          Create user
        </button>
      </div>
    </form>
  );
}
