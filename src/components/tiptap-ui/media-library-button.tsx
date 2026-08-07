"use client";

import { useState } from "react";
import type { Editor } from "@tiptap/react";
import { useTiptapEditor } from "@/hooks/use-tiptap-editor";
import { Button } from "@/components/tiptap-ui-primitive/button";
import { ImagePlusIcon } from "@/components/tiptap-icons/image-plus-icon";
import {
  MediaPickerModal,
  type MediaPickerSelection,
} from "@/components/admin/media-picker-modal";
import { resolveImageAlt } from "@/lib/tiptap-image-alt";

type Props = {
  editor?: Editor | null;
  text?: string;
};

export function MediaLibraryButton({
  editor: providedEditor,
  text = "Library",
}: Props) {
  const { editor } = useTiptapEditor(providedEditor);
  const [open, setOpen] = useState(false);

  const canInsert = Boolean(
    editor?.isEditable && editor.schema.nodes.image,
  );

  function insertMedia(media: MediaPickerSelection) {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .setImage({
        src: media.url,
        alt: resolveImageAlt(editor, media.alt) || media.originalName || "",
        title: media.originalName || undefined,
      })
      .run();
  }

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        disabled={!canInsert}
        data-disabled={!canInsert}
        onClick={() => setOpen(true)}
        tooltip="Insert from Media library"
        aria-label="Insert from Media library"
      >
        <ImagePlusIcon className="tiptap-button-icon" />
        {text ? (
          <span className="tiptap-button-text">{text}</span>
        ) : null}
      </Button>
      <MediaPickerModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={insertMedia}
        kind="image"
        title="Insert image from Media library"
      />
    </>
  );
}
