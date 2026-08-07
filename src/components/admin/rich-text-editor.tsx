"use client";

import dynamic from "next/dynamic";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  /** Used as image alt when paste/upload does not provide one (e.g. article title). */
  imageAltFallback?: string;
};

const SimpleEditor = dynamic(
  () =>
    import("@/components/tiptap-templates/simple/simple-editor").then(
      (mod) => mod.SimpleEditor,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="simple-editor-wrapper">
        <div className="simple-editor-content px-4 py-10 text-sm text-gray-500">
          Loading editor…
        </div>
      </div>
    ),
  },
);

export function RichTextEditor({ value, onChange, imageAltFallback }: Props) {
  return (
    <SimpleEditor
      content={value}
      onChange={onChange}
      imageAltFallback={imageAltFallback}
    />
  );
}
