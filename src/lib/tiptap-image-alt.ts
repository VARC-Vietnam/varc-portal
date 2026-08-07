import { Extension, type Editor } from "@tiptap/react"

export type ImageAltFallbackStorage = {
  value: string
}

declare module "@tiptap/core" {
  interface Storage {
    imageAltFallback: ImageAltFallbackStorage
  }
}

export const ImageAltFallback = Extension.create({
  name: "imageAltFallback",
  addStorage(): ImageAltFallbackStorage {
    return { value: "" }
  },
})

export function getImageAltFallback(editor: Editor | null | undefined): string {
  const value = editor?.storage?.imageAltFallback?.value
  return typeof value === "string" ? value.trim() : ""
}

/** Prefer explicit alt; otherwise use the article/page title fallback. */
export function resolveImageAlt(
  editor: Editor | null | undefined,
  explicitAlt?: string | null,
): string {
  const explicit = explicitAlt?.trim()
  if (explicit) return explicit
  return getImageAltFallback(editor)
}
