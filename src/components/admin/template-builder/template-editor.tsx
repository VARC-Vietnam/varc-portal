"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deletePageTemplateAction,
  savePageTemplateAction,
} from "@/lib/actions";
import {
  emptyLayout,
  type TemplateLayout,
} from "@/lib/blocks/types";
import { TemplateLayoutBuilder } from "@/components/admin/template-builder/template-layout-builder";
import { useConfirm } from "@/components/admin/use-confirm";
import { notifyAction } from "@/components/admin/admin-toast";

type Option = { id: string; label: string; depth?: number };

type Props = {
  templateId?: string;
  initial: {
    name: string;
    description: string;
    key: string;
    isSystem: boolean;
    layout: TemplateLayout;
  };
  articleOptions: Option[];
  categoryOptions: Option[];
};

export function TemplateEditor({
  templateId,
  initial,
  articleOptions,
  categoryOptions,
}: Props) {
  const router = useRouter();
  const { ask, modal } = useConfirm();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [layout, setLayout] = useState<TemplateLayout>(
    initial.layout ?? emptyLayout(),
  );

  function onSave() {
    setError(null);
    startTransition(async () => {
      const result = await savePageTemplateAction(templateId ?? null, {
        name,
        description,
        layout,
      });
      if (!notifyAction(result, "Template saved")) {
        setError(result.error);
        return;
      }
      router.push(`/admin/templates/${result.id}`);
      router.refresh();
    });
  }

  async function onDelete() {
    if (!templateId || initial.isSystem) return;
    const confirmed = await ask({
      title: "Delete template",
      message: "Delete this template? Pages using it may fall back to blank.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deletePageTemplateAction(templateId);
      if (!notifyAction(result, "Template deleted")) {
        setError(result.error);
        return;
      }
      router.push("/admin/templates");
      router.refresh();
    });
  }

  return (
    <>
      <div className="space-y-6">
        {error ? (
          <p className="rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/admin/templates"
            className="text-sm text-gray-600 hover:underline"
          >
            ← Templates
          </Link>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={onSave}
              className="rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-black disabled:opacity-50"
            >
              Save template
            </button>
          </div>
        </div>

        <div className="grid gap-4 rounded-lg border border-gray-200 bg-white p-5 md:grid-cols-2">
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Name</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Key</span>
            <p className="rounded border border-dashed border-gray-300 bg-gray-50 px-3 py-2 font-mono text-sm text-gray-600">
              {initial.key || "(assigned on save)"}
              {initial.isSystem ? " · system" : ""}
            </p>
          </label>
          <label className="block text-sm md:col-span-2">
            <span className="mb-1 block font-medium">Description</span>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded border border-gray-300 px-3 py-2"
            />
          </label>
        </div>

        <TemplateLayoutBuilder
          layout={layout}
          onChange={setLayout}
          articleOptions={articleOptions}
          categoryOptions={categoryOptions}
        />

        {templateId && !initial.isSystem ? (
          <div className="flex justify-end">
            <button
              type="button"
              disabled={pending}
              onClick={onDelete}
              className="rounded border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50"
            >
              Delete template
            </button>
          </div>
        ) : null}
      </div>
      {modal}
    </>
  );
}
