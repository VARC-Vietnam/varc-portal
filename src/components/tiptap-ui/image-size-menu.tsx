"use client"

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
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
  width: number
}

function getSelectedImageSize(editor: Editor): ImageSizePreset {
  const size = editor.getAttributes("image").size
  return isImageSizePreset(size) ? size : "original"
}

/** Prefer the figure wrapper so the menu sits under image + caption. */
function getSelectedImageAnchor(editor: Editor): HTMLElement | null {
  const { selection } = editor.state
  if (!(selection instanceof NodeSelection) || selection.node.type.name !== "image") {
    return null
  }

  const nodeDom = editor.view.nodeDOM(selection.from)
  if (!(nodeDom instanceof HTMLElement)) return null
  if (nodeDom.tagName === "FIGURE" || nodeDom.classList.contains("content-figure")) {
    return nodeDom
  }
  const figure = nodeDom.closest("figure")
  if (figure instanceof HTMLElement) return figure
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

function sanitizeAlt(value: string): string {
  return value.replace(/<[^>]*>/g, "").slice(0, 500)
}

function applyImageAlt(editor: Editor, pos: number, alt: string) {
  const node = editor.state.doc.nodeAt(pos)
  if (!node || node.type.name !== "image") return false

  const nextAlt = sanitizeAlt(alt)
  if ((node.attrs.alt ?? "") === nextAlt) return true

  const tr = editor.state.tr.setNodeMarkup(pos, undefined, {
    ...node.attrs,
    alt: nextAlt,
  })
  editor.view.dispatch(tr)
  return true
}

export function ImageSizeMenu({ editor }: Props) {
  const [visible, setVisible] = useState(false)
  const [activeSize, setActiveSize] = useState<ImageSizePreset>("original")
  const [position, setPosition] = useState<MenuPosition>({
    top: 0,
    left: 0,
    width: 280,
  })
  const [altDraft, setAltDraft] = useState("")
  const [imagePos, setImagePos] = useState<number | null>(null)
  const altFocusedRef = useRef(false)
  const imagePosRef = useRef<number | null>(null)

  const syncMenu = useCallback(() => {
    if (!editor || editor.isDestroyed) {
      setVisible(false)
      return
    }

    if (altFocusedRef.current && imagePosRef.current != null) {
      const pos = imagePosRef.current
      const node = editor.state.doc.nodeAt(pos)
      if (node?.type.name === "image") {
        const nodeDom = editor.view.nodeDOM(pos)
        const anchor =
          nodeDom instanceof HTMLElement
            ? nodeDom.tagName === "FIGURE" ||
              nodeDom.classList.contains("content-figure")
              ? nodeDom
              : (nodeDom.querySelector("figure, img") as HTMLElement | null)
            : null
        if (anchor) {
          const rect = anchor.getBoundingClientRect()
          setPosition({
            top: rect.bottom + 8,
            left: rect.left + rect.width / 2,
            width: Math.max(220, Math.min(rect.width, window.innerWidth - 24)),
          })
          setVisible(true)
          return
        }
      }
      altFocusedRef.current = false
      imagePosRef.current = null
      setImagePos(null)
    }

    if (!isImageNodeSelected(editor)) {
      setVisible(false)
      setImagePos(null)
      imagePosRef.current = null
      return
    }

    const pos = editor.state.selection.from
    setImagePos(pos)
    imagePosRef.current = pos
    setActiveSize(getSelectedImageSize(editor))
    setAltDraft(String(editor.getAttributes("image").alt ?? ""))

    const anchor = getSelectedImageAnchor(editor)
    if (!anchor) {
      setVisible(false)
      return
    }

    const rect = anchor.getBoundingClientRect()
    setPosition({
      top: rect.bottom + 8,
      left: rect.left + rect.width / 2,
      width: Math.max(220, Math.min(rect.width, window.innerWidth - 24)),
    })
    setVisible(true)
  }, [editor])

  useLayoutEffect(() => {
    syncMenu()
  }, [syncMenu])

  useEffect(() => {
    if (!editor) return

    const onUpdate = () => {
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

  const commitAlt = useCallback(
    (value: string) => {
      if (!editor || imagePosRef.current == null) return
      applyImageAlt(editor, imagePosRef.current, value)
    },
    [editor],
  )

  if (!editor || !visible) return null

  return (
    <div
      className="image-size-menu"
      role="toolbar"
      aria-label="Image options"
      style={{
        position: "fixed",
        top: position.top,
        left: position.left,
        width: position.width,
        transform: "translateX(-50%)",
        zIndex: 80,
      }}
      onMouseDown={(event) => {
        const target = event.target as HTMLElement | null
        if (target?.closest("input, textarea, label")) return
        event.preventDefault()
      }}
    >
      <div className="image-size-menu__sizes" role="group" aria-label="Image size">
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

      <label className="image-size-menu__alt">
        <span className="image-size-menu__alt-label">Alt text</span>
        <input
          type="text"
          value={altDraft}
          maxLength={500}
          placeholder="Describe this image"
          aria-label="Image alt text"
          className="image-size-menu__alt-input"
          onFocus={() => {
            altFocusedRef.current = true
          }}
          onChange={(event) => {
            const value = event.target.value
            setAltDraft(value)
            commitAlt(value)
          }}
          onBlur={() => {
            altFocusedRef.current = false
            commitAlt(altDraft)
            requestAnimationFrame(() => syncMenu())
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape" || event.key === "Enter") {
              event.preventDefault()
              ;(event.target as HTMLInputElement).blur()
              if (imagePos != null) {
                editor.chain().focus().setNodeSelection(imagePos).run()
              }
            }
          }}
        />
      </label>
    </div>
  )
}
