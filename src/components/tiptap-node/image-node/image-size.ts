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
  const preset = IMAGE_SIZE_PRESETS.find(
    (item) => item.id === (size ?? "original"),
  )
  return preset?.width ?? null
}
