import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // TipTap UI Components CLI source (vendor-like, React Compiler rules conflict)
    "src/components/tiptap-*/**",
    "src/hooks/use-composed-ref.ts",
    "src/hooks/use-cursor-visibility.ts",
    "src/hooks/use-element-rect.ts",
    "src/hooks/use-is-breakpoint.ts",
    "src/hooks/use-menu-navigation.ts",
    "src/hooks/use-scrolling.ts",
    "src/hooks/use-throttled-callback.ts",
    "src/hooks/use-tiptap-editor.ts",
    "src/hooks/use-unmount.ts",
    "src/hooks/use-window-size.ts",
    "src/lib/tiptap-utils.ts",
  ]),
]);

export default eslintConfig;
