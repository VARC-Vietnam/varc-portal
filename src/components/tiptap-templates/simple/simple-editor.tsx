"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import {
  EditorContent,
  EditorContext,
  useEditor,
  type Editor,
} from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { FindAndReplace } from "@tiptap/extension-find-and-replace"
import { FileHandler } from "@tiptap/extension-file-handler"
import {
  Table,
  TableCell,
  TableHeader,
  TableRow,
} from "@tiptap/extension-table"
import { Selection } from "@tiptap/extensions"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { ResizableImage } from "@/components/tiptap-node/image-node/resizable-image-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { FileUploadButton } from "@/components/tiptap-ui/file-upload-button"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { MediaLibraryButton } from "@/components/tiptap-ui/media-library-button"
import { ImageSizeMenu } from "@/components/tiptap-ui/image-size-menu"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"
import {
  SearchAndReplace,
  SearchAndReplaceButton,
} from "@/components/tiptap-ui/search-and-replace"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"
import { TableColumnAddIcon } from "@/components/tiptap-icons/table-column-add-icon"
import { TableColumnRemoveIcon } from "@/components/tiptap-icons/table-column-remove-icon"
import { TableIcon } from "@/components/tiptap-icons/table-icon"
import { TableRemoveIcon } from "@/components/tiptap-icons/table-remove-icon"
import { TableRowAddIcon } from "@/components/tiptap-icons/table-row-add-icon"
import { TableRowRemoveIcon } from "@/components/tiptap-icons/table-row-remove-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"
import {
  EDITOR_ALLOWED_UPLOAD_MIME,
  uploadFilesIntoEditor,
} from "@/lib/tiptap-file-uploads"
import { ImageAltFallback } from "@/lib/tiptap-image-alt"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

const SEARCH_AND_REPLACE_SCROLL_OPTIONS: ScrollIntoViewOptions = {
  block: "center",
}

export type SimpleEditorProps = {
  content?: string
  onChange?: (html: string) => void
  /** Used as image alt when paste/upload does not provide one (e.g. article title). */
  imageAltFallback?: string
}

const MainToolbarContent = ({
  editor,
  onHighlighterClick,
  onLinkClick,
  onSearchAndReplaceClick,
  isSearchAndReplaceOpen,
  searchAndReplaceButtonRef,
  isMobile,
}: {
  editor: Editor | null
  onHighlighterClick: () => void
  onLinkClick: () => void
  onSearchAndReplaceClick: () => void
  isSearchAndReplaceOpen: boolean
  searchAndReplaceButtonRef: React.RefObject<HTMLButtonElement | null>
  isMobile: boolean
}) => {
  const inTable = editor?.isActive("table") ?? false
  const canInsertTable =
    editor?.can().chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() ??
    false
  const canAddRow = editor?.can().chain().focus().addRowAfter().run() ?? false
  const canAddColumn = editor?.can().chain().focus().addColumnAfter().run() ?? false
  const canDeleteRow = editor?.can().chain().focus().deleteRow().run() ?? false
  const canDeleteColumn = editor?.can().chain().focus().deleteColumn().run() ?? false
  const canDeleteTable = editor?.can().chain().focus().deleteTable().run() ?? false

  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4]} />
        <ListDropdownMenu
          modal={false}
          types={["bulletList", "orderedList", "taskList"]}
        />
        <BlockquoteButton />
        <CodeBlockButton />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <ImageUploadButton text="Add" />
        <MediaLibraryButton text="Library" />
        <FileUploadButton text="File" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <Button
          type="button"
          variant="ghost"
          disabled={!canInsertTable}
          data-disabled={!canInsertTable}
          onClick={() =>
            editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
          }
          tooltip="Insert table"
        >
          <TableIcon className="tiptap-button-icon" />
        </Button>
        {inTable ? (
          <>
            <Button
              type="button"
              variant="ghost"
              disabled={!canAddRow}
              data-disabled={!canAddRow}
              onClick={() => editor?.chain().focus().addRowAfter().run()}
              tooltip="Add row"
            >
              <TableRowAddIcon className="tiptap-button-icon" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!canAddColumn}
              data-disabled={!canAddColumn}
              onClick={() => editor?.chain().focus().addColumnAfter().run()}
              tooltip="Add column"
            >
              <TableColumnAddIcon className="tiptap-button-icon" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!canDeleteRow}
              data-disabled={!canDeleteRow}
              onClick={() => editor?.chain().focus().deleteRow().run()}
              tooltip="Delete row"
            >
              <TableRowRemoveIcon className="tiptap-button-icon" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!canDeleteColumn}
              data-disabled={!canDeleteColumn}
              onClick={() => editor?.chain().focus().deleteColumn().run()}
              tooltip="Delete column"
            >
              <TableColumnRemoveIcon className="tiptap-button-icon" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              disabled={!canDeleteTable}
              data-disabled={!canDeleteTable}
              onClick={() => editor?.chain().focus().deleteTable().run()}
              tooltip="Delete table"
            >
              <TableRemoveIcon className="tiptap-button-icon" />
            </Button>
          </>
        ) : null}
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <SearchAndReplaceButton
          ref={searchAndReplaceButtonRef}
          aria-expanded={isSearchAndReplaceOpen}
          data-active-state={isSearchAndReplaceOpen ? "on" : "off"}
          onClick={onSearchAndReplaceClick}
        />
      </ToolbarGroup>
    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

export function SimpleEditor(props: SimpleEditorProps = {}) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="simple-editor-wrapper">
        <div className="simple-editor-content px-4 py-10 text-sm text-gray-500">
          Loading editor…
        </div>
      </div>
    )
  }

  return <SimpleEditorClient {...props} />
}

function SimpleEditorClient({
  content = "",
  onChange,
  imageAltFallback = "",
}: SimpleEditorProps) {
  const isMobile = useIsBreakpoint()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const [isSearchAndReplaceOpen, setIsSearchAndReplaceOpen] = useState(false)
  const toolbarRef = useRef<HTMLDivElement>(null)
  const searchAndReplaceButtonRef = useRef<HTMLButtonElement>(null)

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      ResizableImage,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      Typography,
      Superscript,
      Subscript,
      Selection,
      FindAndReplace.configure({
        searchDebounceMs: 500,
        injectCSS: false,
      }),
      ImageAltFallback,
      FileHandler.configure({
        allowedMimeTypes: [...EDITOR_ALLOWED_UPLOAD_MIME],
        consumePasteEvent: true,
        onDrop: (currentEditor, files, pos) => {
          void uploadFilesIntoEditor(currentEditor, files, pos)
        },
        onPaste: (currentEditor, files) => {
          void uploadFilesIntoEditor(currentEditor, files)
        },
      }),
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: () => {
          // Avoid logging upload payloads or raw errors in the browser console.
        },
      }),
    ],
    content: content || "",
    onUpdate: ({ editor: current }) => {
      onChange?.(current.getHTML())
    },
  })

  useEffect(() => {
    if (!editor) return
    editor.storage.imageAltFallback.value = imageAltFallback.trim()
  }, [editor, imageAltFallback])

  useEffect(() => {
    if (!editor) return
    const current = editor.getHTML()
    if ((content || "") !== current) {
      editor.commands.setContent(content || "", { emitUpdate: false })
    }
  }, [editor, content])

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  const openSearchAndReplace = useCallback(() => {
    setMobileView("main")
    setIsSearchAndReplaceOpen(true)
  }, [])

  const closeSearchAndReplace = useCallback(() => {
    setIsSearchAndReplaceOpen(false)
    searchAndReplaceButtonRef.current?.focus()
  }, [])

  const toggleSearchAndReplace = useCallback(() => {
    if (isSearchAndReplaceOpen) {
      closeSearchAndReplace()
      return
    }

    openSearchAndReplace()
  }, [closeSearchAndReplace, isSearchAndReplaceOpen, openSearchAndReplace])

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar ref={toolbarRef}>
          {mobileView === "main" ? (
            <MainToolbarContent
              editor={editor}
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              onSearchAndReplaceClick={toggleSearchAndReplace}
              isSearchAndReplaceOpen={isSearchAndReplaceOpen}
              searchAndReplaceButtonRef={searchAndReplaceButtonRef}
              isMobile={isMobile}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <SearchAndReplace
          className="simple-editor-search-and-replace"
          open={isSearchAndReplaceOpen}
          onOpen={openSearchAndReplace}
          onClose={closeSearchAndReplace}
          scrollIntoViewOptions={SEARCH_AND_REPLACE_SCROLL_OPTIONS}
        />

        <ImageSizeMenu editor={editor} />

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  )
}
