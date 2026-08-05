"use client";

import { useEffect, useRef, useState } from "react";
import {
  normalizeCoverFocus,
  type CoverFocusRect,
} from "@/lib/cover-focus";

type Props = {
  src: string;
  focus: CoverFocusRect | string;
  alt?: string;
  className?: string;
  /** fill = zoom until the rect covers the frame (hero). fit = keep whole rect visible. */
  mode?: "fill" | "fit";
};

/**
 * Renders a cover image so the selected focus rectangle is centered in the
 * frame and scaled to fill (or fit) that frame — not CSS object-position alone,
 * which only aligns matching percentages and does not center an arbitrary region.
 */
export function FocusedCoverImage({
  src,
  focus,
  alt = "",
  className = "",
  mode = "fill",
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<{
    width: number;
    height: number;
    left: number;
    top: number;
  } | null>(null);
  const rect = normalizeCoverFocus(focus);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const img = new Image();
    let frame = 0;
    let disposed = false;

    const compute = () => {
      if (disposed) return;
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      const iw = img.naturalWidth;
      const ih = img.naturalHeight;
      if (!cw || !ch || !iw || !ih) return;

      const regionW = iw * (rect.width / 100);
      const regionH = ih * (rect.height / 100);
      if (regionW <= 0 || regionH <= 0) return;

      const scale =
        mode === "fit"
          ? Math.min(cw / regionW, ch / regionH)
          : Math.max(cw / regionW, ch / regionH);

      const displayW = iw * scale;
      const displayH = ih * scale;
      const cx = (rect.x + rect.width / 2) / 100;
      const cy = (rect.y + rect.height / 2) / 100;

      setLayout({
        width: displayW,
        height: displayH,
        left: cw / 2 - cx * displayW,
        top: ch / 2 - cy * displayH,
      });
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(compute);
    };

    const ro = new ResizeObserver(schedule);
    ro.observe(container);

    img.onload = schedule;
    img.src = src;
    if (img.complete) schedule();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      ro.disconnect();
      img.onload = null;
    };
  }, [src, mode, rect.x, rect.y, rect.width, rect.height]);

  return (
    <div ref={containerRef} className={`relative overflow-hidden ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        draggable={false}
        className="absolute max-w-none"
        style={
          layout
            ? {
                width: layout.width,
                height: layout.height,
                left: layout.left,
                top: layout.top,
              }
            : {
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                objectPosition: "50% 50%",
              }
        }
      />
    </div>
  );
}
