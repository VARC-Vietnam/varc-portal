"use client"

import { useCallback, useEffect, useLayoutEffect, useState } from "react"
import type { Editor } from "@tiptap/react"
import { NodeSelection } from "@tiptap/pm/state"

import { Button } from "@/components/tiptap-ui-primitive/button"
import {
  IMAGE_SIZE_PRESETS,
  isImageSizePreset,
  type ImageSizePreset,
  widthForImageSize,
} from "@/components/tiptap-node/image-node/resizable-image-extension"

type Props = {
  editor: Editor | null
}

type MenuPosition = {
  top: number
  left: number
}

function getSelectedImageSize(editor: Editor): ImageSizePreset {
  const size = editor.getAttributes("image").size
  return isImageSizePreset(size) ? size : "original"
}

function getSelectedImageElement(editor: Editor): HTMLElement | null {
  const { selection } = editor.state
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") {
    return null
  }

  const nodeDom = editor.view.nodeDOM(selection.from)
  if (!(nodeDom instanceof HTMLElement)) return null
  if (nodeDom.tagName === "IMG") return nodeDom
  return nodeDom.querySelector("img")
}

function isImageNodeSelected(editor: Editor): boolean {
  if (!editor.isEditable) return false
  const { selection } = editor.state
  return (
    selection instanceof NodeSelection && selection.node.type.name === "image"
  )
}

export function ImageSizeMenu({ editor }: Props) {
  const [visible, setVisible] = useState(false)
  const [activeSize, setActiveSize] = useState<ImageSizePreset>("original")
  const [position, setPosition] = useState<MenuPosition>({ top: 0, left: 0 })

  const syncMenu = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setVisible(false)
      return
    }

    if (!isImageNodeSelected(editor)) {
      setVisible(false)
      return
    }

    setActiveSize(getSelectedImageSize(editor))

    const imageEl = getSelectedImageElement(editor)
    if (!imageEl) {
      setVisible(false)
      return
    }

    const rect = imageEl.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
    })
    setVisible(true)
  }, [editor])

  useLayoutEffect(() => {
    syncMenu()
  }, [syncMenu])

  useEffect(() => {
    if (!editor) return

    const onUpdate = () => {
      // Wait a frame so layout reflects new image size before repositioning.
      requestAnimationFrame(() => syncMenu())
    }

    editor.on("selectionUpdate", onUpdate)
    editor.on("transaction", onUpdate)
    editor.on("focus", onUpdate)
    editor.on("blur", onUpdate)

    const scrollParents: EventTarget[] = [window]
    const content = editor.view.dom.closest(".simple-editor-content")
    if (content) scrollParents.push(content)

    scrollParents.forEach((target) => {
      target.addEventListener("scroll", onUpdate, true)
    })
    window.addEventListener("resize", onUpdate)

    return () => {
      editor.off("selectionUpdate", onUpdate)
      editor.off("transaction", onUpdate)
      editor.off("focus", onUpdate)
      editor.off("blur", onUpdate)
      scrollParents.forEach((target) => {
        target.removeEventListener("scroll", onUpdate, true)
      })
      window.removeEventListener("resize", onUpdate)
    }
  }, [editor, syncMenu])

  const applySize = useCallback(
    (size: ImageSizePreset) => {
      if (!editor || !isImageNodeSelected(editor)) return

      const pos = editor.state.selection.from
      editor
        .chain()
        .updateAttributes("image", {
          size,
          width: widthForImageSize(size),
        })
        .setNodeSelection(pos)
        .run()

      setActiveSize(size)
      requestAnimationFrame(() => {
        requestAnimationFrame(() => syncMenu())
      })
    },
    [editor, syncMenu],
  )

  if (!editor || !visible) return null

  return (
    <div
      className="image-size-menu"
      role="toolbar"
      aria-label="Image size"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        transform: "translateX(-50%)",
        zIndex: 80,
      }}
      onMouseDown={(event) => {
        // Keep image NodeSelection when interacting with the menu.
        event.preventDefault()
      }}
    >
      {IMAGE_SIZE_PRESETS.map((preset) => {
        const isActive = activeSize === preset.id
        return (
          <Button
            key={preset.id}
            type="button"
            variant="ghost"
            size="small"
            data-active-state={isActive ? "on" : "off"}
            aria-pressed={isActive}
            tooltip={
              preset.id === "hd"
                ? "Image size: HD (1280px)"
                : preset.id === "fhd"
                  ? "Image size: FHD (1920px)"
                  : `Image size: ${preset.label}`
            }
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => applySize(preset.id)}
          >
            <span className="tiptap-button-text">{preset.label}</span>
          </Button>
        )
      })}
    </div>
  )
}
