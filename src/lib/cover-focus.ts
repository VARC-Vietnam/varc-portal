/** Focus region as percentages of the source image (0–100). */
export type CoverFocusRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export const DEFAULT_COVER_FOCUS: CoverFocusRect = {
  x: 15,
  y: 15,
  width: 70,
  height: 70,
};

const MIN_SIZE = 8;

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, Math.round(value * 10) / 10));
}

function rectAroundPoint(x: number, y: number, size = 40): CoverFocusRect {
  const half = size / 2;
  const left = clamp(x - half, 0, 100 - size);
  const top = clamp(y - half, 0, 100 - size);
  return {
    x: left,
    y: top,
    width: size,
    height: size,
  };
}

/** Migrate legacy presets/points and normalize rectangle values. */
export function normalizeCoverFocus(value: unknown): CoverFocusRect {
  if (value === "top") return { x: 10, y: 0, width: 80, height: 45 };
  if (value === "center") return { ...DEFAULT_COVER_FOCUS };
  if (value === "bottom") return { x: 10, y: 55, width: 80, height: 45 };

  if (value && typeof value === "object") {
    const record = value as {
      x?: unknown;
      y?: unknown;
      width?: unknown;
      height?: unknown;
      w?: unknown;
      h?: unknown;
    };

    const hasSize =
      typeof record.width === "number" ||
      typeof record.height === "number" ||
      typeof record.w === "number" ||
      typeof record.h === "number";

    if (
      !hasSize &&
      (typeof record.x === "number" || typeof record.y === "number")
    ) {
      return rectAroundPoint(
        typeof record.x === "number" ? record.x : 50,
        typeof record.y === "number" ? record.y : 50,
      );
    }

    if (typeof record.x === "number" || typeof record.y === "number" || hasSize) {
      let x = clamp(typeof record.x === "number" ? record.x : 0, 0, 100);
      let y = clamp(typeof record.y === "number" ? record.y : 0, 0, 100);
      let width = clamp(
        typeof record.width === "number"
          ? record.width
          : typeof record.w === "number"
            ? record.w
            : 40,
        MIN_SIZE,
        100,
      );
      let height = clamp(
        typeof record.height === "number"
          ? record.height
          : typeof record.h === "number"
            ? record.h
            : 40,
        MIN_SIZE,
        100,
      );

      if (x + width > 100) x = Math.max(0, 100 - width);
      if (y + height > 100) y = Math.max(0, 100 - height);

      return { x, y, width, height };
    }
  }

  return { ...DEFAULT_COVER_FOCUS };
}

export function coverFocusCenter(focus: CoverFocusRect): { x: number; y: number } {
  return {
    x: focus.x + focus.width / 2,
    y: focus.y + focus.height / 2,
  };
}

/** Approximate object-position for simple cards (center of the focus rect). */
export function coverFocusObjectPosition(focus: CoverFocusRect | string): string {
  const rect = normalizeCoverFocus(focus);
  const center = coverFocusCenter(rect);
  return `${center.x}% ${center.y}%`;
}
