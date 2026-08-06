"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { duplicatePageTemplateAction } from "@/lib/actions";
import { notifyAction } from "@/components/admin/admin-toast";

type Props = {
  id: string;
  isSystem: boolean;
};

export function TemplateListActions({ id, isSystem }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onDuplicate() {
    startTransition(async () => {
      const result = await duplicatePageTemplateAction(id);
      if (!notifyAction(result, "Template duplicated")) return;
      router.push(`/admin/templates/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2 text-sm">
      <Link href={`/admin/templates/${id}`} className="underline">
        Edit
      </Link>
      <button
        type="button"
        disabled={pending}
        onClick={onDuplicate}
        className="underline disabled:opacity-50"
      >
        Duplicate
      </button>
      {isSystem ? (
        <span className="text-xs text-gray-400">Locked key</span>
      ) : null}
    </div>
  );
}
