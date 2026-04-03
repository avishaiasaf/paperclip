// @ts-nocheck
import { useEffect, useRef, useCallback, useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { Code2 } from "lucide-react";
import { editorExtensions } from "./extensions";
import { EditorToolbar } from "./editor-toolbar";
import { SlashCommands } from "./slash-commands";
import { markdownToHtml, htmlToMarkdown } from "./markdown-utils";

interface KnowledgeEditorProps {
  value: string;
  onChange: (markdown: string) => void;
}

export function KnowledgeEditor({ value, onChange }: KnowledgeEditorProps) {
  const isLoadingRef = useRef(false);
  const [sourceMode, setSourceMode] = useState(false);
  const [sourceText, setSourceText] = useState("");
  const prevValueRef = useRef<string | null>(null);

  const handleUpdate = useCallback(
    ({ editor }: { editor: any }) => {
      if (isLoadingRef.current || !editor) return;
      const html = editor.getHTML();
      const md = htmlToMarkdown(html);
      onChange(md);
    },
    [onChange],
  );

  const editor = useEditor({
    extensions: editorExtensions,
    content: "",
    onUpdate: handleUpdate,
    editorProps: {
      attributes: {
        class: "focus:outline-none min-h-[300px] px-4 py-4 max-w-none prose prose-sm prose-invert",
      },
    },
    immediatelyRender: false,
  });

  // Sync external value into editor (on initial load or external changes)
  useEffect(() => {
    if (!editor || !value) return;
    // Skip if content is the same (user is typing)
    if (prevValueRef.current === value) return;
    prevValueRef.current = value;

    const setContent = async () => {
      isLoadingRef.current = true;
      const html = await markdownToHtml(value);
      editor.commands.setContent(html);
      setTimeout(() => {
        isLoadingRef.current = false;
      }, 50);
    };
    setContent();
  }, [editor, value]);

  const toggleSourceMode = async () => {
    if (!sourceMode) {
      setSourceText(value);
      setSourceMode(true);
    } else {
      onChange(sourceText);
      if (editor) {
        isLoadingRef.current = true;
        const html = await markdownToHtml(sourceText);
        editor.commands.setContent(html);
        prevValueRef.current = sourceText;
        setTimeout(() => { isLoadingRef.current = false; }, 50);
      }
      setSourceMode(false);
    }
  };

  return (
    <div className="flex flex-col overflow-hidden rounded-lg border border-border">
      <div className="flex items-center">
        <div className="flex-1">
          {!sourceMode && <EditorToolbar editor={editor} />}
        </div>
        <button
          onClick={toggleSourceMode}
          className={`flex items-center gap-1.5 px-3 py-1 mr-2 text-[11px] rounded-md transition-colors border border-border ${
            sourceMode
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          <Code2 className="h-3 w-3" />
          {sourceMode ? "Preview" : "Source"}
        </button>
      </div>

      {sourceMode ? (
        <div className="flex-1 overflow-y-auto p-4">
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            className="w-full min-h-[300px] bg-transparent font-mono text-[13px] leading-relaxed resize-none focus:outline-none"
            spellCheck={false}
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto relative">
          <EditorContent editor={editor} />
          <SlashCommands editor={editor} />
        </div>
      )}
    </div>
  );
}
