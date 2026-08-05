import { Image } from "@tiptap/extension-image"

export const IMAGE_SIZE_PRESETS = [
  { id: "small", label: "Small", width: "25%" },
  { id: "medium", label: "Medium", width: "50%" },
  { id: "large", label: "Large", width: "75%" },
  { id: "hd", label: "HD", width: "1280" },
  { id: "fhd", label: "FHD", width: "1920" },
  { id: "original", label: "Original", width: null },
] as const

export type ImageSizePreset = (typeof IMAGE_SIZE_PRESETS)[number]["id"]

export function isImageSizePreset(value: unknown): value is ImageSizePreset {
  return (
    value === "small" ||
    value === "medium" ||
    value === "large" ||
    value === "hd" ||
    value === "fhd" ||
    value === "original"
  )
}

export function widthForImageSize(size: ImageSizePreset | null | undefined) {
  const preset = IMAGE_SIZE_PRESETS.find((item) => item.id === (size ?? "original"))
  return preset?.width ?? null
}

/**
 * TipTap Image with size presets (Small / Medium / Large / HD / FHD / Original).
 * Persists as `data-size` (+ optional `width`) on the rendered `<img>`.
 */
export const ResizableImage = Image.extend({
  name: "image",

  addAttributes() {
    return {
      ...this.parent?.(),
      size: {
        default: "original",
        parseHTML: (element) => {
          const fromData = element.getAttribute("data-size")
          if (isImageSizePreset(fromData)) return fromData

          const width = element.getAttribute("width")?.trim()
          if (width === "25%" || width === "25") return "small"
          if (width === "50%" || width === "50") return "medium"
          if (width === "75%" || width === "75") return "large"
          if (width === "1280" || width === "1280px") return "hd"
          if (width === "1920" || width === "1920px") return "fhd"
          return "original"
        },
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
})
