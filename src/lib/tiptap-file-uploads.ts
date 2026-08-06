import type { Editor } from "@tiptap/react"
import { handleMediaUpload } from "@/lib/tiptap-utils"

export const EDITOR_ALLOWED_UPLOAD_MIME = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "application/zip",
  "application/x-zip-compressed",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
] as const

export function insertUploadedFile(
  editor: Editor,
  file: File,
  url: string,
  pos?: number
) {
  if (file.type.startsWith("image/")) {
    if (typeof pos === "number") {
      editor
        .chain()
        .focus()
        .insertContentAt(pos, {
          type: "image",
          attrs: { src: url, alt: file.name || "" },
        })
        .run()
      return
    }

    editor
      .chain()
      .focus()
      .setImage({ src: url, alt: file.name || "" })
      .run()
    return
  }

  const linkContent = {
    type: "text",
    text: file.name || "Download file",
    marks: [
      {
        type: "link",
        attrs: {
          href: url,
          target: "_blank",
          rel: "noopener noreferrer",
        },
      },
    ],
  } as const

  if (typeof pos === "number") {
    editor
      .chain()
      .focus()
      .insertContentAt(pos, [linkContent, { type: "paragraph" }])
      .run()
    return
  }

  editor
    .chain()
    .focus()
    .insertContent([linkContent, { type: "text", text: " " }])
    .run()
}

export async function uploadFilesIntoEditor(
  editor: Editor,
  files: File[],
  pos?: number
) {
  for (const file of files) {
    try {
      const url = await handleMediaUpload(file)
      insertUploadedFile(editor, file, url, pos)
    } catch {
      // Do not log file contents, names, or raw errors to the browser console.
    }
  }
}
