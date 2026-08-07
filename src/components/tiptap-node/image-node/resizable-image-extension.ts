import { mergeAttributes } from "@tiptap/core"
import { Image } from "@tiptap/extension-image"
import { ReactNodeViewRenderer } from "@tiptap/react"
import { ImageNodeView } from "@/components/tiptap-node/image-node/image-node-view"
import {
  isImageSizePreset,
  widthForImageSize,
  type ImageSizePreset,
} from "@/components/tiptap-node/image-node/image-size"

export {
  IMAGE_SIZE_PRESETS,
  isImageSizePreset,
  widthForImageSize,
  type ImageSizePreset,
} from "@/components/tiptap-node/image-node/image-size"

function sizeFromElement(element: HTMLElement): ImageSizePreset {
  const fromData =
    element.getAttribute("data-size") ||
    element.closest("figure")?.getAttribute("data-size")
  if (isImageSizePreset(fromData)) return fromData

  const width = element.getAttribute("width")?.trim()
  if (width === "25%" || width === "25") return "small"
  if (width === "50%" || width === "50") return "medium"
  if (width === "75%" || width === "75") return "large"
  if (width === "1280" || width === "1280px") return "hd"
  if (width === "1920" || width === "1920px") return "fhd"
  return "original"
}

/**
 * TipTap Image as a block figure: size presets + visible caption from alt text.
 * Persists as <figure class="content-figure"> when alt is set.
 */
export const ResizableImage = Image.extend({
  name: "image",

  // Article images are block figures (caption under the image).
  inline: false,
  group: "block",
  draggable: true,

  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: "original",
        parseHTML: (element) => sizeFromElement(element),
        renderHTML: (attributes) => {
          const size = isImageSizePreset(attributes.size)
            ? attributes.size
            : "original"
          return {
            "data-size": size,
          }
        },
      },
      width: {
        default: null,
        parseHTML: (element) => element.getAttribute("width"),
        renderHTML: (attributes) => {
          const size = isImageSizePreset(attributes.size)
            ? attributes.size
            : "original"
          const width = widthForImageSize(size)
          if (!width) return {}
          return { width }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: "figure.content-figure",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false
          const img = node.querySelector("img")
          if (!img) return false
          const caption = node.querySelector("figcaption")?.textContent?.trim()
          const textAlign =
            node.getAttribute("data-text-align") ||
            node.style.textAlign ||
            undefined
          return {
            src: img.getAttribute("src"),
            alt: caption || img.getAttribute("alt") || "",
            title: img.getAttribute("title"),
            size: sizeFromElement(img),
            width: img.getAttribute("width"),
            textAlign:
              textAlign === "center" ||
              textAlign === "right" ||
              textAlign === "justify" ||
              textAlign === "left"
                ? textAlign
                : null,
          }
        },
      },
      {
        tag: "figure",
        getAttrs: (node) => {
          if (!(node instanceof HTMLElement)) return false
          if (node.classList.contains("content-figure")) return false
          const img = node.querySelector("img")
          if (!img) return false
          const caption = node.querySelector("figcaption")?.textContent?.trim()
          const textAlign =
            node.getAttribute("data-text-align") ||
            node.style.textAlign ||
            undefined
          return {
            src: img.getAttribute("src"),
            alt: caption || img.getAttribute("alt") || "",
            title: img.getAttribute("title"),
            size: sizeFromElement(img),
            width: img.getAttribute("width"),
            textAlign:
              textAlign === "center" ||
              textAlign === "right" ||
              textAlign === "justify" ||
              textAlign === "left"
                ? textAlign
                : null,
          }
        },
      },
      {
        tag: "img[src]",
      },
    ]
  },

  renderHTML({ node, HTMLAttributes }) {
    const size = isImageSizePreset(node.attrs.size)
      ? node.attrs.size
      : isImageSizePreset(HTMLAttributes["data-size"])
        ? HTMLAttributes["data-size"]
        : "original"
    const width = widthForImageSize(size)
    const alt = String(node.attrs.alt ?? HTMLAttributes.alt ?? "").trim()
    const textAlignRaw = String(
      node.attrs.textAlign ??
        HTMLAttributes.textAlign ??
        HTMLAttributes["data-text-align"] ??
        "",
    ).trim()
    const textAlign =
      textAlignRaw === "center" ||
      textAlignRaw === "right" ||
      textAlignRaw === "justify" ||
      textAlignRaw === "left"
        ? textAlignRaw
        : "left"
    const alignStyle =
      textAlign === "center" || textAlign === "justify"
        ? "margin-left: auto; margin-right: auto; text-align: center;"
        : textAlign === "right"
          ? "margin-left: auto; margin-right: 0; text-align: right;"
          : "margin-left: 0; margin-right: auto; text-align: left;"

    const imgAttrs = mergeAttributes(
      this.options.HTMLAttributes,
      HTMLAttributes,
      {
        "data-size": size,
        alt,
        ...(width ? { width } : {}),
      },
    )
    // Avoid leaking internal attrs / text-align style onto the img.
    delete imgAttrs.size
    delete imgAttrs.textAlign
    delete imgAttrs["data-text-align"]
    if (typeof imgAttrs.style === "string") {
      imgAttrs.style = imgAttrs.style
        .replace(/text-align\s*:\s*[^;]+;?/gi, "")
        .replace(/margin-(?:left|right)\s*:\s*[^;]+;?/gi, "")
        .trim()
      if (!imgAttrs.style) delete imgAttrs.style
    }

    const figureAttrs: Record<string, string> = {
      class: `content-figure content-figure--align-${textAlign}`,
      "data-size": size,
      "data-text-align": textAlign,
      style: alignStyle,
    }

    if (!alt) {
      // Keep a figure wrapper so alignment margins still apply when published.
      return ["figure", figureAttrs, ["img", imgAttrs]]
    }

    return [
      "figure",
      figureAttrs,
      ["img", imgAttrs],
      ["figcaption", { class: "content-figcaption" }, alt],
    ]
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView, {
      className: "content-figure-node",
    })
  },
})
