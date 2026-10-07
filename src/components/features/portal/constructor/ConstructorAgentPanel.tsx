"use client";

import type { StoreConfig } from "@/types/store-builder";
import type { TiendaDto as BuilderTiendaDto } from "@/lib/api/admin";

import React, { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import type { OnMount } from "@monaco-editor/react";
import {
  Send,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronUp,
  Check,
  RotateCcw,
  Layers,
  AlertCircle,
  PackagePlus,
  PackageCheck,
  Tag,
  Maximize2,
  Minimize2
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { toast } from "sonner";
import {
  crearPlatformProductosBulk,
  type CrearPlatformProductoBulkInput
} from "@/lib/api/admin";

// Dynamically import Monaco Editor to avoid Next.js SSR issues
const Editor = dynamic(() => import("@monaco-editor/react"), {
  ssr: false,
  loading: () => (
    <div className="h-44 flex items-center justify-center bg-slate-900/60 rounded-xl text-slate-500 text-xs">
      <Loader2 size={16} className="animate-spin text-[#22D3A6] mr-2" />
      Cargando editor Monaco...
    </div>
  ),
});

interface ConstructorAgentPanelProps {
  storeConfig: StoreConfig | null;
  setStoreConfig: React.Dispatch<React.SetStateAction<StoreConfig | null>>;
  activeStore: BuilderTiendaDto | null;
  token?: string | null;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  plan?: string;
  appliedConfig?: StoreConfig;
  isApplied?: boolean;
  productsToCreate?: import("@/lib/agent/store-builder-agent").AgentProduct[];
  isProductsCreated?: boolean;
}

export function ConstructorAgentPanel({
  storeConfig,
  setStoreConfig,
  activeStore,
  token
}: ConstructorAgentPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [creatingProductsId, setCreatingProductsId] = useState<string | null>(null);
  const [expandedPlanId, setExpandedPlanId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [editorHeight, setEditorHeight] = useState<number>(180);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  // Auto-scroll when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const insertXmlTag = (tag: string) => {
    if (!editorRef.current) {
      setInput((prev) => `${prev}\n<${tag}>\n  \n</${tag}>\n`.trim());
      return;
    }
    const editor = editorRef.current;
    const selection = editor.getSelection();
    if (!selection) return;
    const selectedText = editor.getModel()?.getValueInRange(selection) || "";
    const snippet = selectedText
      ? `<${tag}>\n  ${selectedText}\n</${tag}>\n`
      : `<${tag}>\n  \n</${tag}>\n`;

    editor.executeEdits("insert-tag", [
      {
        range: selection,
        text: snippet,
        forceMoveMarkers: true,
      },
    ]);
    const newVal = editor.getValue();
    setInput(newVal);
    editor.focus();
  };

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend !== undefined ? textToSend : input).trim();
    if (!promptText || isLoading) return;

    setInput("");
    if (editorRef.current) {
      editorRef.current.setValue("");
    }
    setErrorMessage(null);

    const userMessage: ChatMessage = {
      id: `user-${crypto.randomUUID()}`,
      role: "user",
      content: promptText
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await fetch("/api/agent/store-builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: promptText,
          storeConfig,
          activeStore,
          history: messages.map((m) => ({
            role: m.role,
            content: m.content
          }))
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al comunicarse con el agente.");
      }

      if (data.action === "clarification") {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${crypto.randomUUID()}`,
            role: "assistant",
            content: data.message
          }
        ]);
        return;
      }

      if (data.action === "build" || data.storeConfig || data.config) {
        const newStoreConfig = data.storeConfig || data.config;

        const assistantMessage: ChatMessage = {
          id: `assistant-${crypto.randomUUID()}`,
          role: "assistant",
          content: data.explanation || "He actualizado el diseño y textos de tu tienda según lo planificado.",
          plan: data.plan,
          appliedConfig: newStoreConfig,
          isApplied: Boolean(newStoreConfig),
          productsToCreate: data.productsToCreate || data.products || []
        };

        setMessages((prev) => [...prev, assistantMessage]);

        if (newStoreConfig) {
          setStoreConfig(newStoreConfig);
          toast.success("¡Diseño y textos aplicados a la tienda!");
        }
      }
    } catch (err) {
      console.error("Error en agente:", err);
      const msg = (err instanceof Error ? err.message : "") || "Ocurrió un error inesperado al procesar la solicitud.";
      setErrorMessage(msg);
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditorDidMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;

    // Send on Ctrl+Enter or Cmd+Enter
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      const currentVal = editor.getValue();
      if (currentVal.trim() && !isLoading) {
        handleSendMessage(currentVal);
      }
    });

    // Custom dark theme for XML highlighting
    monaco.editor.defineTheme("agent-xml-dark", {
      base: "vs-dark",
      inherit: true,
      rules: [
        { token: "tag", foreground: "22D3A6", fontStyle: "bold" },
        { token: "tag.xml", foreground: "22D3A6", fontStyle: "bold" },
        { token: "attribute.name", foreground: "38BDF8" },
        { token: "attribute.value", foreground: "F59E0B" },
        { token: "delimiter", foreground: "94A3B8" },
        { token: "delimiter.xml", foreground: "94A3B8" },
        { token: "comment", foreground: "64748B", fontStyle: "italic" },
      ],
      colors: {
        "editor.background": "#09111c",
        "editor.foreground": "#E2E8F0",
        "editorCursor.foreground": "#22D3A6",
        "editor.lineHighlightBackground": "#0f172a60",
        "editorLineNumber.foreground": "#334155",
        "editorLineNumber.activeForeground": "#22D3A6",
      },
    });
    monaco.editor.setTheme("agent-xml-dark");
  };

  const handleCreateProducts = async (msg: ChatMessage) => {
    if (!msg.productsToCreate || msg.productsToCreate.length === 0 || !token) {
      toast.error("No hay productos sugeridos o falta sesión activa.");
      return;
    }

    setCreatingProductsId(msg.id);

    try {
      const payload: CrearPlatformProductoBulkInput[] = msg.productsToCreate.map((p) => ({
        nombre: p.nombre,
        sku: p.sku || `SKU-${Math.random().toString(36).substring(2, 7).toUpperCase()}`,
        descripcion: p.descripcion || "",
        precioDetalle: Number(p.precioDetalle) || 0,
        precioMayoreo: Number(p.precioMayoreo) || Number(p.precioDetalle) || 0,
        stockActual: Number(p.stockActual) || 25,
        stockMinimo: 5,
        imagenUrl: p.imagenUrl || "",
        publicado: true,
      }));

      const result = await crearPlatformProductosBulk(token, payload);
      const count = result?.length || payload.length;
      toast.success(`¡${count} productos creados y listados en tu tienda!`);

      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id ? { ...m, isProductsCreated: true } : m
        )
      );
    } catch (err) {
      console.error("Error al crear productos desde el agente:", err);
      toast.error((err instanceof Error ? err.message : "") || "Error al crear productos en la base de datos.");
    } finally {
      setCreatingProductsId(null);
    }
  };

  const handleReapply = (msg: ChatMessage) => {
    if (msg.appliedConfig) {
      setStoreConfig(msg.appliedConfig);
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, isApplied: true } : m))
      );
      toast.success("Diseño re-aplicado al lienzo.");
    }
  };

  return (
    <div className="flex flex-col h-full text-left">
      {/* Clean status bar when messages exist */}
      {messages.length > 0 && (
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-900/60 shrink-0">
          <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">
            {messages.length} mensaje{messages.length > 1 ? "s" : ""}
          </span>
          <button
            type="button"
            onClick={() => setMessages([])}
            className="text-[10px] text-slate-500 hover:text-rose-400 flex items-center gap-1 bg-transparent border-none cursor-pointer transition-colors"
            title="Limpiar chat"
          >
            <Trash2 size={11} />
            <span>Limpiar</span>
          </button>
        </div>
      )}

      {/* Error message banner */}
      {errorMessage && (
        <div className="mb-3 p-2.5 rounded-xl border border-rose-900/50 bg-rose-950/30 text-rose-300 text-[11px] flex items-start gap-2 leading-relaxed shrink-0">
          <AlertCircle size={14} className="shrink-0 text-rose-400 mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 pb-3 sidebar-scrollbar text-xs min-h-0">
        {messages.length === 0 ? (
          <div className="flex flex-col gap-3 py-4">
            <div className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 text-center">
              <p className="text-xs font-bold text-white mb-1.5">
                ¿Qué deseas diseñar o crear para tu tienda?
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Escribe tus instrucciones para el estilo visual o la creación de productos. Puedes estructurar tu prompt con etiquetas XML como <span className="text-[#22D3A6] font-mono font-semibold">&lt;context&gt;</span>, <span className="text-[#38BDF8] font-mono font-semibold">&lt;style&gt;</span> o <span className="text-amber-400 font-mono font-semibold">&lt;products&gt;</span>.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${
                msg.role === "user" ? "items-end" : "items-start"
              }`}
            >
              <div
                className={`max-w-[95%] p-3 rounded-2xl ${
                  msg.role === "user"
                    ? "bg-[#22D3A6] text-slate-950 font-medium rounded-tr-xs"
                    : "bg-slate-900/90 border border-slate-800 text-slate-200 rounded-tl-xs shadow-lg"
                }`}
              >
                {/* Plan Accordion Card */}
                {msg.plan && (
                  <div className="mb-2.5 border border-slate-800 rounded-xl bg-slate-955/80 overflow-hidden">
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedPlanId(
                          expandedPlanId === msg.id ? null : msg.id
                        )
                      }
                      className="w-full flex items-center justify-between p-2 text-[10px] font-bold uppercase tracking-wider text-[#22D3A6] bg-slate-900/60 hover:bg-slate-900 transition-colors border-none cursor-pointer"
                    >
                      <span className="flex items-center gap-1.5">
                        <Layers size={12} />
                        Plan de Diseño Estratégico
                      </span>
                      {expandedPlanId === msg.id ? (
                        <ChevronUp size={13} />
                      ) : (
                        <ChevronDown size={13} />
                      )}
                    </button>

                    {expandedPlanId === msg.id && (
                      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-300 leading-relaxed font-sans prose prose-invert max-w-none prose-p:my-1 prose-headings:my-1.5 prose-headings:text-xs prose-headings:font-bold prose-headings:text-[#22D3A6] prose-ul:my-1 prose-li:my-0.5">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.plan}
                        </ReactMarkdown>
                      </div>
                    )}
                  </div>
                )}

                {/* Explanation Content */}
                <div className="prose prose-invert max-w-none text-xs leading-relaxed prose-p:my-1">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
                </div>

                {/* Products to Create Card */}
                {msg.productsToCreate && msg.productsToCreate.length > 0 && (
                  <div className="mt-3 p-2.5 rounded-xl border border-slate-800 bg-slate-955/90 space-y-2.5">
                    <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-[#38BDF8] flex items-center gap-1.5">
                        <Tag size={12} />
                        Catálogo Sugerido ({msg.productsToCreate.length} items)
                      </span>
                      <span className="text-[9px] font-bold text-slate-400">
                        {activeStore?.nombre || "Tienda"}
                      </span>
                    </div>

                    {/* Products Grid */}
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 sidebar-scrollbar">
                      {msg.productsToCreate.map((prod, pIdx) => (
                        <div
                          key={pIdx}
                          className="flex items-center gap-2 p-1.5 rounded-lg border border-slate-850 bg-slate-900/60"
                        >
                          {prod.imagenUrl && (
                            <img
                              src={prod.imagenUrl}
                              alt={prod.nombre}
                              className="w-9 h-9 rounded-md object-cover shrink-0 border border-slate-800"
                              onError={(e) => {
                                (e.target as HTMLElement).style.display = "none";
                              }}
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-[11px] font-bold text-white truncate">
                              {prod.nombre}
                            </p>
                            <p className="text-[9px] text-slate-400 truncate">
                              SKU: {prod.sku || "N/A"} • Stock: {prod.stockActual || 20}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-[#22D3A6] bg-[#22D3A6]/10 px-1.5 py-0.5 rounded border border-[#22D3A6]/20 block">
                              Q{prod.precioDetalle}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Button to save products into database */}
                    <button
                      type="button"
                      onClick={() => handleCreateProducts(msg)}
                      disabled={msg.isProductsCreated || creatingProductsId === msg.id}
                      className={`w-full h-8 flex items-center justify-center gap-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border-none transition-all cursor-pointer shadow-md ${
                        msg.isProductsCreated
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-800/80 cursor-default"
                          : "bg-linear-to-r from-[#38BDF8] to-[#22D3A6] text-slate-950 hover:opacity-90 active:scale-[0.99]"
                      }`}
                    >
                      {creatingProductsId === msg.id ? (
                        <>
                          <Loader2 size={12} className="animate-spin" />
                          <span>Guardando productos en catálogo...</span>
                        </>
                      ) : msg.isProductsCreated ? (
                        <>
                          <PackageCheck size={13} className="text-emerald-400" />
                          <span>Guardados en tu catálogo</span>
                        </>
                      ) : (
                        <>
                          <PackagePlus size={13} />
                          <span>Guardar {msg.productsToCreate.length} productos en mi catálogo</span>
                        </>
                      )}
                    </button>
                  </div>
                )}

                {/* Applied status or Reapply button for design */}
                {msg.appliedConfig && (
                  <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2">
                    <span className="text-[10px] text-[#22D3A6] font-bold flex items-center gap-1">
                      <Check size={12} />
                      Diseño aplicado a la tienda
                    </span>
                    <button
                      type="button"
                      onClick={() => handleReapply(msg)}
                      className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded-md border-none cursor-pointer transition-all"
                      title="Volver a aplicar esta versión de diseño"
                    >
                      <RotateCcw size={10} />
                      Re-aplicar
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex items-center gap-2 p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 text-xs animate-pulse">
            <Loader2 size={14} className="animate-spin text-[#22D3A6]" />
            <span>Diseñando y generando productos...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input area with Monaco XML Editor */}
      <div className="pt-2 border-t border-slate-900 mt-auto flex flex-col gap-2 shrink-0">
        {/* Quick XML Tags & Expand Toolbar */}
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[10px] text-slate-500 font-mono font-bold">Etiquetas:</span>
            {["context", "style", "products", "rules"].map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => insertXmlTag(tag)}
                className="px-2 py-0.5 rounded-md bg-slate-900 hover:bg-slate-800 text-[10px] font-mono text-slate-300 hover:text-[#22D3A6] border border-slate-800 hover:border-[#22D3A6]/40 transition-colors cursor-pointer"
                title={`Insertar etiqueta <${tag}>`}
              >
                + &lt;{tag}&gt;
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setEditorHeight((prev) => (prev === 180 ? 300 : 180))}
            className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 bg-slate-900 hover:bg-slate-800 px-2 py-0.5 rounded border border-slate-800 transition-colors cursor-pointer shrink-0"
            title="Expandir o reducir altura del editor"
          >
            {editorHeight === 180 ? <Maximize2 size={11} /> : <Minimize2 size={11} />}
            <span>{editorHeight === 180 ? "Expandir" : "Reducir"}</span>
          </button>
        </div>

        {/* Monaco Editor Container */}
        <div className="rounded-xl border border-slate-800 bg-[#09111c] overflow-hidden focus-within:border-[#22D3A6]/60 transition-colors shadow-inner">
          <Editor
            height={`${editorHeight}px`}
            language="xml"
            theme="agent-xml-dark"
            value={input}
            onChange={(val) => setInput(val || "")}
            onMount={handleEditorDidMount}
            options={{
              minimap: { enabled: false },
              fontSize: 12.5,
              lineHeight: 20,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              lineNumbers: "on",
              lineNumbersMinChars: 2,
              scrollBeyondLastLine: false,
              automaticLayout: true,
              wordWrap: "on",
              padding: { top: 8, bottom: 8 },
              scrollbar: {
                vertical: "visible",
                horizontal: "hidden",
                verticalScrollbarSize: 6,
              },
              smoothScrolling: true,
              cursorBlinking: "smooth",
              renderLineHighlight: "all",
              tabSize: 2,
            }}
          />
        </div>

        {/* Action / Send Bar */}
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono">
            Ctrl+Enter para enviar
          </span>

          <button
            type="button"
            onClick={() => handleSendMessage()}
            disabled={isLoading || !input.trim()}
            className="px-4 py-2 rounded-xl bg-linear-to-r from-[#22D3A6] to-[#1AB38C] text-slate-950 font-bold text-xs hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center gap-1.5 shadow-md cursor-pointer"
            title="Enviar prompt (Ctrl+Enter)"
          >
            {isLoading ? (
              <>
                <Loader2 size={13} className="animate-spin" />
                <span>Generando...</span>
              </>
            ) : (
              <>
                <Send size={13} />
                <span>Enviar</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
