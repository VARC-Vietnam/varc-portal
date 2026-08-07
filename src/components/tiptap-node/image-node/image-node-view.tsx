"use client"

import type { CSSProperties } from "react"
import { NodeViewWrapper, type NodeViewProps } from "@tiptap/react"
import {
  isImageSizePreset,
  widthForImageSize,
} from "@/components/tiptap-node/image-node/image-size"

function figureAlignStyle(align: string | null | undefined): CSSProperties {
  const value = align?.trim() || "left"
  if (value === "center") {
    return { marginLeft: "auto", marginRight: "auto", textAlign: "center" }
  }
  if (value === "right") {
    return { marginLeft: "auto", marginRight: 0, textAlign: "right" }
  }
  if (value === "justify") {
    return { marginLeft: "auto", marginRight: "auto", textAlign: "center" }
  }
  return { marginLeft: 0, marginRight: "auto", textAlign: "left" }
}

/**
 * Renders the image with an optional caption under it when alt text is set.
 */
export function ImageNodeView({ node, selected }: NodeViewProps) {
  const src = String(node.attrs.src ?? "")
  const alt = String(node.attrs.alt ?? "").trim()
  const title = node.attrs.title ? String(node.attrs.title) : undefined
  const size = isImageSizePreset(node.attrs.size) ? node.attrs.size : "original"
  const width = widthForImageSize(size)
  const textAlign = String(node.attrs.textAlign ?? "left")

  return (
    <NodeViewWrapper
      as="figure"
      className={`content-figure content-figure--align-${textAlign}${selected ? " ProseMirror-selectednode" : ""}`}
      data-size={size}
      data-text-align={textAlign}
      data-drag-handle
      style={figureAlignStyle(textAlign)}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        title={title}
        data-size={size}
        width={width ?? undefined}
        draggable={false}
      />
      {alt ? <figcaption className="content-figcaption">{alt}</figcaption> : null}
    </NodeViewWrapper>
  )
}
