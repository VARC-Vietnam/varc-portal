"use client"

import { forwardRef, useCallback, useRef } from "react"
import { useHotkeys } from "react-hotkeys-hook"
import { parseShortcutKeys } from "@/lib/tiptap-utils"
import { useTiptapEditor } from "@/hooks/use-tiptap-editor"
import type { UseFileUploadConfig } from "@/components/tiptap-ui/file-upload-button"
import {
  FILE_UPLOAD_SHORTCUT_KEY,
  useFileUpload,
} from "@/components/tiptap-ui/file-upload-button"
import type { ButtonProps } from "@/components/tiptap-ui-primitive/button"
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Badge } from "@/components/tiptap-ui-primitive/badge"
import { EDITOR_ALLOWED_UPLOAD_MIME } from "@/lib/tiptap-file-uploads"

type IconProps = React.SVGProps<SVGSVGElement>
type IconComponent = ({ className, ...props }: IconProps) => React.ReactElement

export interface FileUploadButtonProps
  extends Omit<ButtonProps, "type">,
    UseFileUploadConfig {
  text?: string
  showShortcut?: boolean
  icon?: React.MemoExoticComponent<IconComponent> | React.FC<IconProps>
}

export function FileShortcutBadge({
  shortcutKeys = FILE_UPLOAD_SHORTCUT_KEY,
}: {
  shortcutKeys?: string
}) {
  return <Badge>{parseShortcutKeys({ shortcutKeys })}</Badge>
}

export const FileUploadButton = forwardRef<HTMLButtonElement, FileUploadButtonProps>(
  (
    {
      editor: providedEditor,
      text,
      hideWhenUnavailable = false,
      onInserted,
      showShortcut = false,
      onClick,
      icon: CustomIcon,
      children,
      ...buttonProps
    },
    ref
  ) => {
    const inputRef = useRef<HTMLInputElement>(null)
    const { editor } = useTiptapEditor(providedEditor)
    const {
      isVisible,
      canInsert,
      handleFiles,
      label,
      isActive,
      shortcutKeys,
      Icon,
    } = useFileUpload({
      editor,
      hideWhenUnavailable,
      onInserted,
    })

    const handleClick = useCallback(
      (event: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(event)
        if (event.defaultPrevented) return
        inputRef.current?.click()
      },
      [onClick]
    )

    useHotkeys(
      FILE_UPLOAD_SHORTCUT_KEY,
      (event) => {
        event.preventDefault()
        inputRef.current?.click()
      },
      {
        enabled: isVisible && canInsert,
        enableOnContentEditable: true,
        enableOnFormTags: true,
      }
    )

    if (!isVisible) {
      return null
    }

    const RenderIcon = CustomIcon ?? Icon

    return (
      <>
        <input
          ref={inputRef}
          type="file"
          className="sr-only"
          multiple
          accept={EDITOR_ALLOWED_UPLOAD_MIME.join(",")}
          onChange={async (event) => {
            await handleFiles(event.target.files)
            event.target.value = ""
          }}
        />
        <Button
          type="button"
          variant="ghost"
          data-active-state={isActive ? "on" : "off"}
          role="button"
          tabIndex={-1}
          disabled={!canInsert}
          data-disabled={!canInsert}
          aria-label={label}
          aria-pressed={isActive}
          tooltip={label}
          onClick={handleClick}
          {...buttonProps}
          ref={ref}
        >
          {children ?? (
            <>
              <RenderIcon className="tiptap-button-icon" />
              {text && <span className="tiptap-button-text">{text}</span>}
              {showShortcut && <FileShortcutBadge shortcutKeys={shortcutKeys} />}
            </>
          )}
        </Button>
      </>
    )
  }
)

FileUploadButton.displayName = "FileUploadButton"
