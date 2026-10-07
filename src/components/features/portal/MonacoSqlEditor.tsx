"use client";

import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from "react";
import { useTranslations } from "next-intl";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import { Code2, Sparkles, Loader2, Play, BookOpen, Terminal, Check } from "lucide-react";
import { SCHEMA_TABLES, SQL_KEYWORDS, type SchemaTable } from "./sqlSchemaData";

// Dynamically import Monaco Editor to avoid SSR window/document issues in Next.js
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

export interface MonacoSqlEditorHandle {
  insertText: (text: string) => void;
  setValue: (value: string) => void;
  getValue: () => string;
  focus: () => void;
}

interface MonacoSqlEditorProps {
  value: string;
  onChange: (value: string) => void;
  onExecute: () => void;
  onToggleHelp?: () => void;
  isLoading?: boolean;
  height?: string;
}

type MonacoEditor = Parameters<OnMount>[0];
type MonacoInstance = Parameters<OnMount>[1];

export const MonacoSqlEditor = forwardRef<MonacoSqlEditorHandle, MonacoSqlEditorProps>(
  ({ value, onChange, onExecute, onToggleHelp, isLoading = false, height = "280px" }, ref) => {
    const t = useTranslations("SqlEditor");
    const editorRef = useRef<MonacoEditor | null>(null);
    const monacoRef = useRef<MonacoInstance | null>(null);
    const completionDisposableRef = useRef<{ dispose(): void } | null>(null);
    const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });
    const [lineCount, setLineCount] = useState(1);

    // Cleanup completion provider on unmount
    useEffect(() => {
      return () => {
        if (completionDisposableRef.current) {
          completionDisposableRef.current.dispose();
          completionDisposableRef.current = null;
        }
      };
    }, []);

    // Helper to insert text at cursor position in Monaco Editor
    const insertTextAtCursor = (text: string) => {
      if (!editorRef.current) {
        const newVal = (value ? value + " " : "") + text;
        onChange(newVal);
        return;
      }

      const editor = editorRef.current;
      const selection = editor.getSelection();
      const model = editor.getModel();
      const range =
        selection ||
        (model
          ? model.getFullModelRange()
          : { startLineNumber: 1, startColumn: 1, endLineNumber: 1, endColumn: 1 });

      editor.executeEdits("insert-snippet", [
        {
          range,
          text,
          forceMoveMarkers: true,
        },
      ]);
      const currentVal = editor.getValue();
      onChange(currentVal);
      editor.focus();
    };

    useImperativeHandle(ref, () => ({
      insertText: (text: string) => {
        insertTextAtCursor(text);
      },
      setValue: (val: string) => {
        onChange(val);
        if (editorRef.current) {
          editorRef.current.setValue(val);
          editorRef.current.focus();
        }
      },
      getValue: () => {
        if (editorRef.current) {
          return editorRef.current.getValue();
        }
        return value;
      },
      focus: () => {
        if (editorRef.current) {
          editorRef.current.focus();
        }
      },
    }));

    const handleEditorDidMount: OnMount = (editor, monaco) => {
      editorRef.current = editor;
      monacoRef.current = monaco;

      // Define custom dark theme matching DM Hub portal layout
      monaco.editor.defineTheme("dmhub-dark", {
        base: "vs-dark",
        inherit: true,
        rules: [
          { token: "keyword", foreground: "22D3A6", fontStyle: "bold" },
          { token: "string", foreground: "38BDF8" },
          { token: "number", foreground: "F59E0B" },
          { token: "comment", foreground: "64748B", fontStyle: "italic" },
          { token: "variable", foreground: "E2E8F0" },
          { token: "delimiter", foreground: "94A3B8" },
          { token: "operator", foreground: "38BDF8" },
        ],
        colors: {
          "editor.background": "#09111c",
          "editor.foreground": "#E2E8F0",
          "editorCursor.foreground": "#22D3A6",
          "editor.lineHighlightBackground": "#0F1D2E60",
          "editorLineNumber.foreground": "#475569",
          "editorLineNumber.activeForeground": "#22D3A6",
          "editorSuggestWidget.background": "#0b1523",
          "editorSuggestWidget.border": "#1E293B",
          "editorSuggestWidget.foreground": "#E2E8F0",
          "editorSuggestWidget.selectedBackground": "#16253b",
          "editorSuggestWidget.highlightForeground": "#22D3A6",
          "editorSuggestWidget.focusBorder": "#22D3A6",
          "editorScrollbar.shadow": "#00000000",
        },
      });

      monaco.editor.setTheme("dmhub-dark");

      // Listen for content changes to always keep React parent state synchronized
      editor.onDidChangeModelContent(() => {
        const val = editor.getValue();
        onChange(val);
        const model = editor.getModel();
        if (model) {
          setLineCount(model.getLineCount());
        }
      });

      // Track cursor position
      editor.onDidChangeCursorPosition((e) => {
        setCursorPos({ line: e.position.lineNumber, col: e.position.column });
      });

      const initialModel = editor.getModel();
      if (initialModel) {
        setLineCount(initialModel.getLineCount());
      }

      // Dispose previous completion provider if any to prevent duplicates
      if (completionDisposableRef.current) {
        completionDisposableRef.current.dispose();
      }

      // Register PostgreSQL & Tenant ID completion provider
      completionDisposableRef.current = monaco.languages.registerCompletionItemProvider("sql", {
        triggerCharacters: [" ", ".", "@", "W", "w", "T", "t", '"', "s", "S", "j", "J", "p", "P", "*"],
        provideCompletionItems: (model: import("monaco-editor").editor.ITextModel, position: import("monaco-editor").Position) => {
          const word = model.getWordUntilPosition(position);
          const lineContent = model.getLineContent(position.lineNumber);
          const textBeforeWord = lineContent.substring(0, word.startColumn - 1);

          const defaultRange = {
            startLineNumber: position.lineNumber,
            endLineNumber: position.lineNumber,
            startColumn: word.startColumn,
            endColumn: word.endColumn,
          };

          const suggestions: import("monaco-editor").languages.CompletionItem[] = [];

          // 1. Mandatory / Tenant Context suggestions (Top Priority)
          suggestions.push({
            label: "tienda_id = @tenant_id",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "tienda_id = @tenant_id",
            detail: "⚡ Filtro Explícito de Tenant",
            documentation: "Filtra la consulta por la variable fuertemente tipada @tenant_id (respaldado además a nivel motor por PostgreSQL RLS).",
            range: defaultRange,
            sortText: "0000",
          });

          suggestions.push({
            label: "WHERE tienda_id = @tenant_id",
            kind: monaco.languages.CompletionItemKind.Snippet,
            insertText: "WHERE tienda_id = @tenant_id",
            detail: "⚡ Cláusula WHERE con @tenant_id",
            documentation: "Inserta 'WHERE tienda_id = @tenant_id' para filtrado explícito de tienda en tus reportes.",
            range: defaultRange,
            sortText: "0001",
          });

          suggestions.push({
            label: "@tenant_id",
            kind: monaco.languages.CompletionItemKind.Variable,
            insertText: "@tenant_id",
            detail: "🔑 Parámetro del Tenant Activo",
            documentation: "Parámetro inyectado de forma segura en PostgreSQL sin manipular cadenas SQL.",
            range: defaultRange,
            sortText: "0002",
          });

          // 2. SQL Clauses (JOIN, ORDER BY, LIMIT, GROUP BY, etc.)
          const sqlSnippets = [
            { label: "LEFT JOIN", text: 'LEFT JOIN public." " ON ', detail: "Unión izquierda de tablas" },
            { label: "INNER JOIN", text: 'INNER JOIN public." " ON ', detail: "Unión interna de tablas" },
            { label: "ORDER BY", text: "ORDER BY ", detail: "Ordenamiento de resultados" },
            { label: "LIMIT", text: "LIMIT 50", detail: "Límite de filas a devolver" },
            { label: "GROUP BY", text: "GROUP BY ", detail: "Agrupación de resultados" },
            { label: "HAVING", text: "HAVING ", detail: "Filtro de grupos agregados" },
          ];

          sqlSnippets.forEach((s, idx) => {
            suggestions.push({
              label: s.label,
              kind: monaco.languages.CompletionItemKind.Snippet,
              insertText: s.text,
              detail: `⚡ ${s.detail}`,
              range: defaultRange,
              sortText: `000${3 + idx}`,
            });
          });

          // 3. Add SQL Keywords
          SQL_KEYWORDS.forEach((keyword) => {
            suggestions.push({
              label: keyword,
              kind: monaco.languages.CompletionItemKind.Keyword,
              insertText: keyword,
              detail: "Palabra clave PostgreSQL",
              range: defaultRange,
              sortText: "0050",
            });
          });

          // 4. Add Accurate Schema Tables & Columns
          SCHEMA_TABLES.forEach((item: SchemaTable) => {
            // Intelligent replacement range when public." or public. or " precedes word
            let tableRange = defaultRange;
            if (textBeforeWord.endsWith('public."')) {
              const hasClosingQuote = lineContent.charAt(position.column - 1) === '"';
              tableRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn - 8,
                endColumn: hasClosingQuote ? word.endColumn + 1 : word.endColumn,
              };
            } else if (textBeforeWord.endsWith('public.')) {
              tableRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn - 7,
                endColumn: word.endColumn,
              };
            } else if (textBeforeWord.endsWith('"')) {
              const hasClosingQuote = lineContent.charAt(position.column - 1) === '"';
              tableRange = {
                startLineNumber: position.lineNumber,
                endLineNumber: position.lineNumber,
                startColumn: word.startColumn - 1,
                endColumn: hasClosingQuote ? word.endColumn + 1 : word.endColumn,
              };
            }

            // Table with schema
            suggestions.push({
              label: item.table,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: item.table,
              detail: `[Tabla] ${item.detail}`,
              documentation: `Columnas:\n${item.columns.map((c) => `• ${c.name} (${c.type}): ${c.description}`).join("\n")}`,
              range: tableRange,
              sortText: "0010",
            });

            // Table with simple label
            suggestions.push({
              label: item.label,
              kind: monaco.languages.CompletionItemKind.Class,
              insertText: item.table,
              detail: `[Tabla] ${item.table} - ${item.detail}`,
              documentation: `Columnas:\n${item.columns.map((c) => `• ${c.name} (${c.type}): ${c.description}`).join("\n")}`,
              range: tableRange,
              sortText: "0011",
            });

            // Add individual columns
            item.columns.forEach((col) => {
              suggestions.push({
                label: `${col.name} (${item.label})`,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: col.name,
                detail: `Columna de ${item.table} [${col.type}]`,
                documentation: `${col.description}${col.isPk ? " (PK)" : ""}${col.isFk ? ` (FK -> ${col.fkRef})` : ""}`,
                range: defaultRange,
                sortText: "0020",
              });
            });
          });

          return { suggestions };
        },
      });

      // Keybinding: Ctrl + Enter (or Cmd + Enter) to Execute Query
      editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
        onExecute();
      });
    };

    return (
      <div className="space-y-2.5">
        {/* Helper & Toolbar Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 bg-slate-900/90 px-4 py-3 rounded-xl border border-slate-800/90 shadow-sm">
          <div className="flex items-center gap-2.5 text-xs text-slate-200 font-semibold">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-[#22D3A6]/10 text-[#22D3A6] border border-[#22D3A6]/20">
              <Terminal size={14} />
            </div>
            <span className="tracking-wide">{t("console_title")}</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Toggle Schema Help Button */}
            {onToggleHelp && (
              <button
                type="button"
                onClick={onToggleHelp}
                className="px-3 py-1.5 text-[11px] font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/80 rounded-lg transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                title={t("view_schema_tooltip")}
              >
                <BookOpen size={13} className="text-[#22D3A6]" />
                <span>{t("view_schema_button")}</span>
              </button>
            )}

            {/* Quick Insert WHERE tienda_id = @tenant_id */}
            <button
              type="button"
              onClick={() => insertTextAtCursor(" WHERE tienda_id = @tenant_id")}
              className="px-3 py-1.5 text-[11px] font-mono font-bold bg-[#22D3A6]/10 text-[#22D3A6] hover:bg-[#22D3A6]/20 border border-[#22D3A6]/30 rounded-lg transition-all flex items-center gap-1 cursor-pointer"
              title={t("insert_tenant_filter_tooltip")}
            >
              <Sparkles size={12} />
              + tienda_id = @tenant_id
            </button>

            {/* Quick Insert @tenant_id */}
            <button
              type="button"
              onClick={() => insertTextAtCursor("@tenant_id")}
              className="px-2.5 py-1.5 text-[11px] font-mono font-bold bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 border border-sky-500/30 rounded-lg transition-all cursor-pointer"
              title={t("insert_tenant_var_tooltip")}
            >
              + @tenant_id
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div className="rounded-xl border border-slate-800 bg-[#09111c] relative shadow-inner p-1">
          <div className="p-2 sm:p-3">
            <Editor
              height={height}
              defaultLanguage="sql"
              theme="dmhub-dark"
              value={value}
              onChange={(val) => onChange(val || "")}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13.5,
                lineHeight: 22,
                fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', 'Courier New', monospace",
                fontLigatures: true,
                lineNumbers: "on",
                lineNumbersMinChars: 3,
                scrollBeyondLastLine: false,
                automaticLayout: true,
                wordWrap: "on",
                padding: { top: 16, bottom: 16 },
                suggestOnTriggerCharacters: true,
                tabCompletion: "on",
                fixedOverflowWidgets: true,
                quickSuggestions: {
                  other: true,
                  comments: false,
                  strings: true,
                },
                suggest: {
                  showWords: false,
                  localityBonus: true,
                  preview: true,
                },
                scrollbar: {
                  vertical: "visible",
                  horizontal: "visible",
                  verticalScrollbarSize: 8,
                  horizontalScrollbarSize: 8,
                },
                smoothScrolling: true,
                cursorBlinking: "smooth",
                renderLineHighlight: "all",
              }}
            />
          </div>

          {/* Editor Status Bar */}
          <div className="flex items-center justify-between border-t border-slate-800/80 bg-[#060b13] px-4 py-1.5 text-[11px] font-mono text-slate-400 select-none">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1 text-[#22D3A6]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#22D3A6] animate-pulse" />
                {t("postgres_ready")}
              </span>
              <span className="text-slate-600">|</span>
              <span>{t("lines_label", { count: lineCount })}</span>
              <span className="text-slate-600">|</span>
              <span>{t("cursor_position", { line: cursorPos.line, col: cursorPos.col })}</span>
            </div>

            <div className="flex items-center gap-2 text-slate-500">
              <span>{t("chars_label", { count: value.length })}</span>
            </div>
          </div>

          {isLoading && (
            <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center gap-3 text-xs font-bold text-[#22D3A6] z-10">
              <Loader2 size={24} className="animate-spin text-[#22D3A6]" />
              <div className="text-center space-y-1">
                <span className="text-sm text-white font-semibold">{t("executing_query")}</span>
                <p className="text-[11px] text-slate-400 font-normal">{t("fetching_data")}</p>
              </div>
            </div>
          )}
        </div>

        {/* Shortcuts & hints footer */}
        <div className="text-[11px] text-slate-400 flex flex-wrap items-center justify-between gap-2 px-1">
          <span className="flex items-center gap-1.5">
            <Play size={11} className="text-[#22D3A6] fill-[#22D3A6]" />
            <span>
              {t("execute_hint")} <kbd className="px-1.5 py-0.5 bg-slate-800 text-[#22D3A6] rounded text-[10px] font-mono border border-slate-700">Ctrl + Enter</kbd>
            </span>
          </span>
          <span className="text-slate-500">
            {t("autocomplete_hint")} <kbd className="px-1.5 py-0.5 bg-slate-800 text-slate-300 rounded text-[10px] font-mono border border-slate-700">Ctrl + Espacio</kbd>
          </span>
        </div>
      </div>
    );
  }
);

MonacoSqlEditor.displayName = "MonacoSqlEditor";

export default MonacoSqlEditor;

