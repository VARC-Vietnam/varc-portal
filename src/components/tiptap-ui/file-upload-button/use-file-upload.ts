"use client"

import { useCallback, useEffect, useState } from "react"
import { type Editor } from "@tiptap/react"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import { isMarkInSchema } from "@/lib/tiptap-utils"
import { FilePlusIcon } from "@/components/tiptap-icons/file-plus-icon"
import { uploadFilesIntoEditor } from "@/lib/tiptap-file-uploads"

export const FILE_UPLOAD_SHORTCUT_KEY = "mod+shift+f"

export interface UseFileUploadConfig {
  editor?: Editor | null
  hideWhenUnavailable?: boolean
  onInserted?: () => void
}

export function canInsertFile(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  return isMarkInSchema("link", editor)
}

export function isFileUploadActive(editor: Editor | null): boolean {
  if (!editor || !editor.isEditable) return false
  return false
}

export function shouldShowFileButton(props: {
  editor: Editor | null
  hideWhenUnavailable: boolean
}): boolean {
  const { editor, hideWhenUnavailable } = props
  if (!editor || !editor.isEditable) return false
  if (!hideWhenUnavailable) return true
  if (!isMarkInSchema("link", editor)) return false
  if (!editor.isActive("code")) {
    return canInsertFile(editor)
  }
  return true
}

export function useFileUpload(config?: UseFileUploadConfig) {
  const {
    editor: providedEditor,
    hideWhenUnavailable = false,
    onInserted,
  } = config || {}

  const { editor } = useTiptapEditor(providedEditor)
  const [isVisible, setIsVisible] = useState(true)
  const canInsert = canInsertFile(editor)
  const isActive = isFileUploadActive(editor)

  useEffect(() => {
    if (!editor) return

    const handleSelectionUpdate = () => {
      setIsVisible(shouldShowFileButton({ editor, hideWhenUnavailable }))
    }

    handleSelectionUpdate()
    editor.on("selectionUpdate", handleSelectionUpdate)

    return () => {
      editor.off("selectionUpdate", handleSelectionUpdate)
    }
  }, [editor, hideWhenUnavailable])

  const handleFiles = useCallback(
    async (files: FileList | File[] | null) => {
      if (!editor || !files?.length) return false
      await uploadFilesIntoEditor(editor, Array.from(files))
      onInserted?.()
      return true
    },
    [editor, onInserted]
  )

  return {
    isVisible,
    isActive,
    canInsert,
    handleFiles,
    label: "Add file",
    shortcutKeys: FILE_UPLOAD_SHORTCUT_KEY,
    Icon: FilePlusIcon,
  }
}
