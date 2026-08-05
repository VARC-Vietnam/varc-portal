"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  normalizeCoverFocus,
  type CoverFocusRect,
} from "@/lib/cover-focus";
import { FocusedCoverImage } from "@/components/portal/focused-cover-image";

type Props = {
  imageUrl: string;
  value: CoverFocusRect;
  onChange: (value: CoverFocusRect) => void;
};

type ImageBox = {
  left: number;
  top: number;
  width: number;
  height: number;
};

function containedImageBox(
  container: DOMRect,
  naturalWidth: number,
  naturalHeight: number,
): ImageBox {
  const containerRatio = container.width / container.height;
  const imageRatio = naturalWidth / naturalHeight;

  if (imageRatio > containerRatio) {
    const width = container.width;
    const height = width / imageRatio;
    return {
      left: 0,
      top: (container.height - height) / 2,
      width,
      height,
    };
  }

  const height = container.height;
  const width = height * imageRatio;
  return {
    left: (container.width - width) / 2,
    top: 0,
    width,
    height,
  };
}

function percentFromPointer(
  event: { clientX: number; clientY: number },
  stage: DOMRect,
  box: ImageBox,
): { x: number; y: number } {
  const localX = event.clientX - stage.left - box.left;
  const localY = event.clientY - stage.top - box.top;
  return {
    x: Math.min(100, Math.max(0, (localX / box.width) * 100)),
    y: Math.min(100, Math.max(0, (localY / box.height) * 100)),
  };
}

function rectFromCorners(
  a: { x: number; y: number },
  b: { x: number; y: number },
): CoverFocusRect {
  const left = Math.min(a.x, b.x);
  const top = Math.min(a.y, b.y);
  const right = Math.max(a.x, b.x);
  const bottom = Math.max(a.y, b.y);
  return normalizeCoverFocus({
    x: left,
    y: top,
    width: Math.max(8, right - left),
    height: Math.max(8, bottom - top),
  });
}

export function CoverFocusPicker({ imageUrl, value, onChange }: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const dragOriginRef = useRef<{ x: number; y: number } | null>(null);
  const [editing, setEditing] = useState(false);
  const [imageBox, setImageBox] = useState<ImageBox | null>(null);
  const [draft, setDraft] = useState<CoverFocusRect | null>(null);

  const measure = useCallback(() => {
    const stage = stageRef.current;
    const img = imgRef.current;
    if (!stage || !img || !img.naturalWidth || !img.naturalHeight) return;
    setImageBox(
      containedImageBox(
        stage.getBoundingClientRect(),
        img.naturalWidth,
        img.naturalHeight,
      ),
    );
  }, []);

  useEffect(() => {
    if (!editing) return;
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [editing, imageUrl, measure]);

  const displayRect = draft ?? value;

  const overlayStyle =
    imageBox != null
      ? {
          left: imageBox.left + (imageBox.width * displayRect.x) / 100,
          top: imageBox.top + (imageBox.height * displayRect.y) / 100,
          width: (imageBox.width * displayRect.width) / 100,
          height: (imageBox.height * displayRect.height) / 100,
        }
      : {
          left: `${displayRect.x}%`,
          top: `${displayRect.y}%`,
          width: `${displayRect.width}%`,
          height: `${displayRect.height}%`,
        };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-gray-900">Cover focus</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {editing
              ? "Drag on the image to draw the rectangle the hero should keep and zoom into."
              : "Hero crops and zooms around this rectangular region."}
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft(null);
            setEditing((prev) => !prev);
          }}
          className={`rounded border px-3 py-1.5 text-sm transition-colors ${
            editing
              ? "border-gray-900 bg-gray-900 text-white"
              : "border-gray-300 bg-white text-gray-800 hover:bg-gray-50"
          }`}
        >
          {editing ? "Done" : "Change focus"}
        </button>
      </div>

      {editing ? (
        <div
          ref={stageRef}
          onPointerDown={(event) => {
            const stage = stageRef.current;
            const img = imgRef.current;
            if (!stage || !img?.naturalWidth) return;
            event.currentTarget.setPointerCapture(event.pointerId);
            const rect = stage.getBoundingClientRect();
            const box = containedImageBox(
              rect,
              img.naturalWidth,
              img.naturalHeight,
            );
            const origin = percentFromPointer(event, rect, box);
            dragOriginRef.current = origin;
            setDraft(rectFromCorners(origin, origin));
          }}
          onPointerMove={(event) => {
            const origin = dragOriginRef.current;
            const stage = stageRef.current;
            const img = imgRef.current;
            if (!origin || !stage || !img?.naturalWidth) return;
            const rect = stage.getBoundingClientRect();
            const box = containedImageBox(
              rect,
              img.naturalWidth,
              img.naturalHeight,
            );
            setDraft(rectFromCorners(origin, percentFromPointer(event, rect, box)));
          }}
          onPointerUp={(event) => {
            const origin = dragOriginRef.current;
            const stage = stageRef.current;
            const img = imgRef.current;
            dragOriginRef.current = null;
            if (origin && stage && img?.naturalWidth) {
              const rect = stage.getBoundingClientRect();
              const box = containedImageBox(
                rect,
                img.naturalWidth,
                img.naturalHeight,
              );
              const next = rectFromCorners(
                origin,
                percentFromPointer(event, rect, box),
              );
              setDraft(null);
              onChange(next);
            }
            try {
              event.currentTarget.releasePointerCapture(event.pointerId);
            } catch {
              /* already released */
            }
          }}
          onPointerCancel={() => {
            dragOriginRef.current = null;
            setDraft(null);
          }}
          className="relative aspect-[16/10] cursor-crosshair select-none overflow-hidden rounded-md border border-gray-300 bg-gray-900 touch-none"
          role="application"
          aria-label="Drag to draw cover focus rectangle"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            src={imageUrl}
            alt=""
            draggable={false}
            onLoad={measure}
            className="pointer-events-none h-full w-full object-contain"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-black/35"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute border-2 border-white bg-transparent shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]"
            style={overlayStyle}
          >
            <span className="absolute -top-px -left-px h-2.5 w-2.5 bg-white" />
            <span className="absolute -top-px -right-px h-2.5 w-2.5 bg-white" />
            <span className="absolute -bottom-px -left-px h-2.5 w-2.5 bg-white" />
            <span className="absolute -right-px -bottom-px h-2.5 w-2.5 bg-white" />
          </div>
        </div>
      ) : (
        <div className="aspect-[21/9] overflow-hidden rounded-md border border-gray-200 bg-gray-100">
          <FocusedCoverImage
            src={imageUrl}
            focus={value}
            className="h-full w-full"
            mode="fill"
          />
        </div>
      )}

      <p className="mt-2 text-xs text-gray-500">
        Region {Math.round(displayRect.width)}% × {Math.round(displayRect.height)}%
        at ({Math.round(displayRect.x)}%, {Math.round(displayRect.y)}%)
        {editing
          ? " — drag to redraw; that region will be centered in the hero."
          : " — centered and zoomed to fill the hero frame."}
      </p>
    </div>
  );
}
