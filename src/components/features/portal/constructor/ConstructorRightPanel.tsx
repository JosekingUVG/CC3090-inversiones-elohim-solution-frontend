"use client";

import type { StoreConfig } from "@/types/store-builder";
import type { TiendaDto as BuilderTiendaDto } from "@/lib/api/admin";

import React, { useState, useRef, useEffect } from "react";
import { Upload, Plus, Trash2, ArrowUp, ArrowDown, ArrowLeft, X, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { ConstructorAgentPanel } from "./ConstructorAgentPanel";

interface ConstructorRightPanelProps {
  storeConfig: StoreConfig | null;
  setStoreConfig: React.Dispatch<React.SetStateAction<StoreConfig | null>>;
  activePageId: string;
  selectedSectionId: string;
  setSelectedSectionId: (id: string) => void;
  showRightPanel: boolean;
  setShowRightPanel: (show: boolean) => void;
  panelMode?: "section" | "agent";
  setPanelMode?: (mode: "section" | "agent") => void;
  activeStore?: BuilderTiendaDto | null;
  token: string | null;
  cloudinaryConfig: {
    cloudName: string;
    apiKey: string;
    hasCredentials: boolean;
  };
  handlePropertyChange: (property: string, value: unknown) => void;
  handleDeleteSection: () => void;
  handleMoveBlock: (sectionId: string, blockIndex: number, direction: "up" | "down") => void;
  handleAddBlock: (sectionId: string, blockType: "text" | "image" | "product_card") => void;
  handleDeleteBlock: (sectionId: string, blockIndex: number) => void;
  handleBlockFieldChange: (sectionId: string, blockIndex: number, field: string, value: unknown) => void;
}

export function ConstructorRightPanel({
  storeConfig,
  setStoreConfig,
  activePageId,
  selectedSectionId,
  setSelectedSectionId,
  showRightPanel,
  setShowRightPanel,
  panelMode = "section",
  setPanelMode,
  activeStore,
  token,
  cloudinaryConfig,
  handlePropertyChange,
  handleDeleteSection,
  handleMoveBlock,
  handleAddBlock,
  handleDeleteBlock,
  handleBlockFieldChange
}: ConstructorRightPanelProps) {
  const currentPage = storeConfig?.pages.find((p) => p.id === activePageId) || storeConfig?.pages[0];
  const currentSection = currentPage?.sections.find((s) => s.id === selectedSectionId);

  const isAgentMode = panelMode === "agent";
  const isOpen = showRightPanel && (isAgentMode || Boolean(currentSection));
  const props = currentSection?.properties || {};

  const [panelWidth, setPanelWidth] = useState<number>(440);
  const [isResizing, setIsResizing] = useState<boolean>(false);
  const isResizingRef = useRef<boolean>(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;
      const newWidth = window.innerWidth - e.clientX;
      const minWidth = 360;
      const maxWidth = Math.min(window.innerWidth * 0.9, 950);
      if (newWidth >= minWidth && newWidth <= maxWidth) {
        setPanelWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      if (isResizingRef.current) {
        isResizingRef.current = false;
        setIsResizing(false);
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  if (selectedSectionId === "theme-settings" && panelMode !== "agent") {
    return null; // The Left Panel handles design settings
  }

  if (!storeConfig) return null;

  const handleMouseDownResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = true;
    setIsResizing(true);
    document.body.style.cursor = "ew-resize";
    document.body.style.userSelect = "none";
  };

  const handleClose = () => {
    setShowRightPanel(false);
    setSelectedSectionId("");
    if (setPanelMode) setPanelMode("section");
  };

  const handleBack = () => {
    setSelectedSectionId("");
    setShowRightPanel(false);
    if (setPanelMode) setPanelMode("section");
  };

  return (
    <>
      {/* Backdrop overlay on smaller screens */}
      {isOpen && (
        <div
          className="fixed inset-0 z-45 bg-black/60 xl:hidden animate-fade-in"
          onClick={handleClose}
        />
      )}

      {/* Floating Overlay Drawer */}
      <div
        style={{
          width: isOpen ? `${panelWidth}px` : undefined,
          maxWidth: "92vw",
        }}
        className={`
          fixed inset-y-0 right-0 z-50
          bg-slate-950 border-l border-slate-800 shadow-[0_0_50px_rgba(0,0,0,0.8)]
          flex flex-col p-5 gap-5 overflow-y-auto sidebar-scrollbar select-none
          text-left
          ${isResizing ? "" : "transition-transform duration-300 ease-in-out"}
          ${isOpen ? "translate-x-0" : "translate-x-full pointer-events-none"}
        `}
      >
        {/* Resize Handle on the left border */}
        <div
          onMouseDown={handleMouseDownResize}
          className="absolute top-0 bottom-0 left-0 w-3 -translate-x-1/2 cursor-ew-resize hover:bg-[#22D3A6]/40 active:bg-[#22D3A6] transition-colors z-50 group flex items-center justify-center"
          title="Arrastra hacia la izquierda para expandir el panel"
        >
          <div className="w-1 h-12 rounded-full bg-slate-700/60 group-hover:bg-[#22D3A6] group-active:bg-[#22D3A6] transition-colors" />
        </div>

        {isAgentMode ? (
          <div className="flex-1 flex flex-col min-h-0 h-full">
            {/* Header for Agent in Right Panel */}
            <div className="flex items-center justify-between border-b border-slate-900 pb-3 mb-2 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all border-none bg-transparent cursor-pointer"
                  title="Volver"
                >
                  <ArrowLeft size={16} />
                </button>
                <h4 className="text-sm font-bold text-white leading-tight">Agente</h4>
              </div>

              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-all border-none bg-transparent cursor-pointer"
                title="Cerrar panel de Agente"
              >
                <X size={16} />
              </button>
            </div>

            {/* Agent Chat Body */}
            <div className="flex-1 min-h-0 flex flex-col">
              <ConstructorAgentPanel
                storeConfig={storeConfig}
                setStoreConfig={setStoreConfig}
                activeStore={activeStore ?? null}
                token={token}
              />
            </div>
          </div>
        ) : currentSection ? (
          <>
              {/* Header with Back Arrow and Close X */}
              <div className="flex items-center justify-between border-b border-slate-900 pb-3 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all border-none bg-transparent cursor-pointer shrink-0"
                    title="Volver"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="min-w-0">
                    <span className="text-xs font-black text-[#22D3A6] tracking-wide uppercase truncate block">
                      {currentSection.name}
                    </span>
                    <span className="text-[9px] font-mono text-slate-500 uppercase">
                      #{currentSection?.id}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-900 transition-all border-none bg-transparent cursor-pointer"
                    title="Cerrar panel de configuración"
                  >
                    <X size={16} />
                  </button>
                </div>
              </div>

        {/* ANNOUNCEMENT PROPERTIES */}
        {currentSection.type === "announcement" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Texto del Banner</label>
              <textarea
                value={props.bannerText}
                onChange={(e) => handlePropertyChange("bannerText", e.target.value)}
                className="w-full h-16 p-2 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6] transition-all resize-none"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Color Fondo</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={props.backgroundColor || "#1AB38C"}
                    onChange={(e) => handlePropertyChange("backgroundColor", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent outline-none p-0 shrink-0"
                  />
                  <span className="text-[10px] font-bold font-mono text-slate-400">{props.backgroundColor || "#1AB38C"}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Color Texto</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={props.textColor || "#FFFFFF"}
                    onChange={(e) => handlePropertyChange("textColor", e.target.value)}
                    className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent outline-none p-0 shrink-0"
                  />
                  <span className="text-[10px] font-bold font-mono text-slate-400">{props.textColor || "#FFFFFF"}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Grosor de Fuente</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-955/45 p-1 rounded-xl border border-slate-900">
                {["Medium", "Bold"].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => handlePropertyChange("fontWeight", w)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all ${
                      props.fontWeight === w ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:text-white bg-transparent"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-y border-slate-900/40 my-1">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-350">Sticky Banner</span>
                <span className="text-[9px] text-slate-500 font-medium">Mantener fijo en scroll</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={props.stickyBanner || false}
                  onChange={(e) => handlePropertyChange("stickyBanner", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22D3A6] peer-checked:after:bg-slate-950" />
              </label>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                <span>Padding Vertical</span>
                <span className="text-[#22D3A6] font-mono">{props.verticalPadding || 8}px</span>
              </div>
              <input
                type="range"
                min="4"
                max="24"
                value={props.verticalPadding || 8}
                onChange={(e) => handlePropertyChange("verticalPadding", parseInt(e.target.value))}
                className="w-full accent-[#22D3A6] h-1.5 rounded-lg bg-slate-900 outline-none cursor-pointer border-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Acción del Link</label>
              <select
                value={props.linkAction || "None"}
                onChange={(e) => handlePropertyChange("linkAction", e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs font-semibold outline-none focus:border-[#22D3A6] cursor-pointer"
              >
                <option value="Open Link">Abrir Enlace</option>
                <option value="None">Ninguna</option>
              </select>
            </div>

            {props.linkAction === "Open Link" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">URL del Enlace</label>
                <input
                  type="text"
                  value={props.linkUrl || ""}
                  onChange={(e) => handlePropertyChange("linkUrl", e.target.value)}
                  className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
                />
              </div>
            )}
          </div>
        )}

        {/* HEADER PROPERTIES */}
        {currentSection.type === "header" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Nombre de la Tienda</label>
              <input
                type="text"
                value={props.storeName || ""}
                onChange={(e) => handlePropertyChange("storeName", e.target.value)}
                className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">URL del Logotipo</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={props.logoUrl || ""}
                  onChange={(e) => handlePropertyChange("logoUrl", e.target.value)}
                  placeholder="http://imagen..."
                  className="flex-1 h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
                />
                {cloudinaryConfig.hasCredentials && (
                  <label className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 shrink-0">
                    <Upload size={14} />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            toast.loading("Subiendo logotipo...");
                            const url = await uploadToCloudinary(file, token!);
                            handlePropertyChange("logoUrl", url);
                            toast.dismiss();
                            toast.success("Logotipo subido correctamente");
                          } catch (err) {
                            toast.dismiss();
                            toast.error(err instanceof Error ? err.message : "Error al subir logotipo");
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Enlaces de Navegación</label>
              <div className="flex flex-col gap-2">
                {(props.menuItems || []).map((item: string, idx: number) => (
                  <div key={idx} className="flex gap-2">
                    <input
                      type="text"
                      value={item}
                      onChange={(e) => {
                        const newItems = [...(props.menuItems || [])];
                        newItems[idx] = e.target.value;
                        handlePropertyChange("menuItems", newItems);
                      }}
                      className="flex-1 h-9 px-3 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
                    />
                    <button
                      onClick={() => {
                        const newItems = (props.menuItems || []).filter((_, i: number) => i !== idx);
                        handlePropertyChange("menuItems", newItems);
                      }}
                      className="p-2 h-9 rounded-xl border border-slate-800 hover:border-red-500 hover:text-red-400 bg-transparent text-slate-500 transition-all cursor-pointer flex items-center justify-center"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => {
                    handlePropertyChange("menuItems", [...(props.menuItems || []), "Nuevo Link"]);
                  }}
                  className="h-8 mt-1 border border-dashed border-slate-800 hover:border-[#22D3A6]/45 text-[10px] text-slate-400 hover:text-[#22D3A6] bg-transparent rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 font-bold uppercase tracking-wider"
                >
                  <Plus size={10} />
                  <span>Añadir Enlace</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* HERO PROPERTIES */}
        {currentSection.type === "hero" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Título Principal</label>
              <input
                type="text"
                value={props.title || ""}
                onChange={(e) => handlePropertyChange("title", e.target.value)}
                className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Subtítulo</label>
              <textarea
                value={props.subtitle || ""}
                onChange={(e) => handlePropertyChange("subtitle", e.target.value)}
                className="w-full h-20 p-2 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6] transition-all resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Botón Principal</label>
                <input
                  type="text"
                  value={props.primaryButtonText || ""}
                  onChange={(e) => handlePropertyChange("primaryButtonText", e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Botón Secundario</label>
                <input
                  type="text"
                  value={props.secondaryButtonText || ""}
                  onChange={(e) => handlePropertyChange("secondaryButtonText", e.target.value)}
                  className="h-9 px-3 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
                />
              </div>
            </div>

            {props.primaryButtonText && (
              <div className="flex flex-col gap-1.5 border-t border-slate-900/60 pt-3">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Acción Botón Principal</label>
                <select
                  value={props.primaryButtonAction || ""}
                  onChange={(e) => {
                    handlePropertyChange("primaryButtonAction", e.target.value);
                    handlePropertyChange("primaryButtonValue", "");
                  }}
                  className="h-9 px-2 rounded-xl border border-slate-800 bg-slate-955 text-slate-350 text-xs outline-none focus:border-[#22D3A6] cursor-pointer"
                >
                  <option value="">Ninguna acción</option>
                  <option value="external_url">Redirigir a URL externa</option>
                  <option value="login">Login</option>
                  <option value="register">Register</option>
                  <option value="section_redirect">Redirigir a sección de esta página</option>
                  <option value="page_redirect">Redirigir a otra página del sitio</option>
                </select>

                {props.primaryButtonAction === "external_url" && (
                  <input
                    type="text"
                    placeholder="https://ejemplo.com"
                    value={props.primaryButtonValue || ""}
                    onChange={(e) => handlePropertyChange("primaryButtonValue", e.target.value)}
                    className="h-9 px-3 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
                  />
                )}

                {props.primaryButtonAction === "section_redirect" && (
                  <select
                    value={props.primaryButtonValue || ""}
                    onChange={(e) => handlePropertyChange("primaryButtonValue", e.target.value)}
                    className="h-9 px-2 rounded-xl border border-slate-800 bg-slate-955 text-slate-350 text-xs outline-none focus:border-[#22D3A6] cursor-pointer"
                  >
                    <option value="">Selecciona sección...</option>
                    {(currentPage?.sections || [])
                      .filter((s) => s.id !== "announcement" && s.id !== "header" && s.id !== "footer")
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>
                      ))}
                  </select>
                )}

                {props.primaryButtonAction === "page_redirect" && (
                  <select
                    value={props.primaryButtonValue || ""}
                    onChange={(e) => handlePropertyChange("primaryButtonValue", e.target.value)}
                    className="h-9 px-2 rounded-xl border border-slate-800 bg-slate-955 text-slate-350 text-xs outline-none focus:border-[#22D3A6] cursor-pointer"
                  >
                    <option value="">Selecciona página...</option>
                    {(storeConfig.pages || []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            {props.secondaryButtonText && (
              <div className="flex flex-col gap-1.5 border-t border-slate-900/60 pt-3">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Acción Botón Secundario</label>
                <select
                  value={props.secondaryButtonAction || ""}
                  onChange={(e) => {
                    handlePropertyChange("secondaryButtonAction", e.target.value);
                    handlePropertyChange("secondaryButtonValue", "");
                  }}
                  className="h-9 px-2 rounded-xl border border-slate-800 bg-slate-955 text-slate-350 text-xs outline-none focus:border-[#22D3A6] cursor-pointer"
                >
                  <option value="">Ninguna acción</option>
                  <option value="external_url">Redirigir a URL externa</option>
                  <option value="login">Login</option>
                  <option value="register">Register</option>
                  <option value="section_redirect">Redirigir a sección de esta página</option>
                  <option value="page_redirect">Redirigir a otra página del sitio</option>
                </select>

                {props.secondaryButtonAction === "external_url" && (
                  <input
                    type="text"
                    placeholder="https://ejemplo.com"
                    value={props.secondaryButtonValue || ""}
                    onChange={(e) => handlePropertyChange("secondaryButtonValue", e.target.value)}
                    className="h-9 px-3 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
                  />
                )}

                {props.secondaryButtonAction === "section_redirect" && (
                  <select
                    value={props.secondaryButtonValue || ""}
                    onChange={(e) => handlePropertyChange("secondaryButtonValue", e.target.value)}
                    className="h-9 px-2 rounded-xl border border-slate-800 bg-slate-955 text-slate-350 text-xs outline-none focus:border-[#22D3A6] cursor-pointer"
                  >
                    <option value="">Selecciona sección...</option>
                    {(currentPage?.sections || [])
                      .filter((s) => s.id !== "announcement" && s.id !== "header" && s.id !== "footer")
                      .map((s) => (
                        <option key={s.id} value={s.id}>{s.name} (#{s.id})</option>
                      ))}
                  </select>
                )}

                {props.secondaryButtonAction === "page_redirect" && (
                  <select
                    value={props.secondaryButtonValue || ""}
                    onChange={(e) => handlePropertyChange("secondaryButtonValue", e.target.value)}
                    className="h-9 px-2 rounded-xl border border-slate-800 bg-slate-955 text-slate-350 text-xs outline-none focus:border-[#22D3A6] cursor-pointer"
                  >
                    <option value="">Selecciona página...</option>
                    {(storeConfig.pages || []).map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
                    ))}
                  </select>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Imagen de Fondo URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={props.backgroundImage || ""}
                  onChange={(e) => handlePropertyChange("backgroundImage", e.target.value)}
                  placeholder="http://imagen..."
                  className="flex-1 h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
                />
                {cloudinaryConfig.hasCredentials && (
                  <label className="h-10 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700 shrink-0">
                    <Upload size={14} />
                    <span>Subir</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            toast.loading("Subiendo fondo...");
                            const url = await uploadToCloudinary(file, token!);
                            handlePropertyChange("backgroundImage", url);
                            toast.dismiss();
                            toast.success("Imagen de fondo subida correctamente");
                          } catch (err) {
                            toast.dismiss();
                            toast.error(err instanceof Error ? err.message : "Error al subir fondo");
                          }
                        }
                      }}
                      className="hidden"
                    />
                  </label>
                )}
              </div>
            </div>

            {props.backgroundImage && (
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Opacidad de Filtro Oscuro</span>
                  <span className="text-[#22D3A6] font-mono">{props.overlayOpacity ?? 60}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="90"
                  value={props.overlayOpacity ?? 60}
                  onChange={(e) => handlePropertyChange("overlayOpacity", parseInt(e.target.value))}
                  className="w-full accent-[#22D3A6] h-1.5 rounded-lg bg-slate-900 outline-none cursor-pointer border-none"
                />
              </div>
            )}
          </div>
        )}

        {/* PRODUCTS GRID PROPERTIES */}
        {currentSection.type === "products" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Título de Sección</label>
              <input
                type="text"
                value={props.title || ""}
                onChange={(e) => handlePropertyChange("title", e.target.value)}
                className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Subtítulo</label>
              <input
                type="text"
                value={props.subtitle || ""}
                onChange={(e) => handlePropertyChange("subtitle", e.target.value)}
                placeholder="Ej. Los artículos más destacados"
                className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Diseño del Catálogo</label>
              <div className="grid grid-cols-2 gap-2 bg-slate-955/45 p-1 rounded-xl border border-slate-900">
                {[
                  { value: "grid", label: "Cuadrícula" },
                  { value: "list", label: "Lista" }
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handlePropertyChange("layoutType", type.value)}
                    className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all ${
                      (props.layoutType || "grid") === type.value ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:text-white bg-transparent"
                    }`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
            </div>

            {(props.layoutType || "grid") === "grid" && (
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider font-semibold">Columnas (Escritorio)</label>
                <div className="grid grid-cols-3 gap-2 bg-slate-955/45 p-1 rounded-xl border border-slate-900">
                  {[2, 3, 4].map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => handlePropertyChange("columns", col)}
                      className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all ${
                        (props.columns || 3) === col ? "bg-slate-800 text-white shadow-md" : "text-slate-500 hover:text-white bg-transparent"
                      }`}
                    >
                      {col} Cols
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider font-semibold">
                <span>Productos a Mostrar</span>
                <span className="text-[#22D3A6] font-mono">{props.productsCount || 3}</span>
              </div>
              <input
                type="range"
                min="1"
                max="12"
                value={props.productsCount || 3}
                onChange={(e) => handlePropertyChange("productsCount", parseInt(e.target.value))}
                className="w-full accent-[#22D3A6] h-1.5 rounded-lg bg-slate-900 outline-none cursor-pointer border-none"
              />
            </div>

            <div className="flex items-center justify-between py-1 border-y border-slate-900/40 my-1">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-300">Barra de Búsqueda</span>
                <span className="text-[9px] text-slate-500 font-medium">Permite buscar en la sección</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={props.showSearch || false}
                  onChange={(e) => handlePropertyChange("showSearch", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22D3A6] peer-checked:after:bg-slate-955" />
              </label>
            </div>
          </div>
        )}

        {/* RICH TEXT PROPERTIES */}
        {currentSection.type === "richtext" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Título del Bloque</label>
              <input
                type="text"
                value={props.title || ""}
                onChange={(e) => handlePropertyChange("title", e.target.value)}
                className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Contenido de Texto</label>
              <textarea
                value={props.content || ""}
                onChange={(e) => handlePropertyChange("content", e.target.value)}
                className="w-full h-28 p-3 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6] resize-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider font-semibold">
                <span>Padding Vertical</span>
                <span className="text-[#22D3A6] font-mono">{props.paddingVertical || 48}px</span>
              </div>
              <input
                type="range"
                min="12"
                max="96"
                value={props.paddingVertical || 48}
                onChange={(e) => handlePropertyChange("paddingVertical", parseInt(e.target.value))}
                className="w-full accent-[#22D3A6] h-1.5 rounded-lg bg-slate-900 outline-none cursor-pointer border-none"
              />
            </div>
          </div>
        )}

        {/* CUSTOM SECTION / BLOCKS PROPERTIES */}
        {currentSection.type === "custom" && (
          <div className="flex flex-col gap-4">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Bloques Contenidos</span>
            <div className="flex flex-col gap-3">
              {(props.blocks || []).map((block, idx: number) => (
                <div key={block.id} className="p-3 rounded-xl border border-slate-900 bg-slate-955/20 space-y-2.5">
                  <div className="flex justify-between items-center border-b border-slate-900/60 pb-1.5">
                    <span className="text-[9px] font-bold uppercase text-[#38BDF8]">
                      {block.type === "text" ? "Texto" : block.type === "image" ? "Imagen" : "Tarjeta Producto"}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => handleMoveBlock(currentSection?.id, idx, "up")}
                        disabled={idx === 0}
                        className="p-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border-none cursor-pointer text-slate-400 hover:text-white"
                      >
                        <ArrowUp size={10} />
                      </button>
                      <button
                        onClick={() => handleMoveBlock(currentSection?.id, idx, "down")}
                        disabled={idx === ((props.blocks || []).length - 1)}
                        className="p-1 rounded bg-slate-900 hover:bg-slate-800 disabled:opacity-30 border-none cursor-pointer text-slate-400 hover:text-white"
                      >
                        <ArrowDown size={10} />
                      </button>
                      <button
                        onClick={() => handleDeleteBlock(currentSection?.id, idx)}
                        className="p-1 rounded bg-slate-900 hover:bg-rose-950/20 hover:text-rose-400 border-none cursor-pointer text-slate-500"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  </div>

                  {block.type === "text" && (
                    <textarea
                      value={block.content || ""}
                      onChange={(e) => handleBlockFieldChange(currentSection?.id, idx, "content", e.target.value)}
                      placeholder="Escribe tu texto personalizado..."
                      className="w-full h-16 p-2 rounded-lg border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6] resize-none"
                    />
                  )}

                  {block.type === "image" && (
                    <div className="flex flex-col gap-2">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={block.url || ""}
                          onChange={(e) => handleBlockFieldChange(currentSection?.id, idx, "url", e.target.value)}
                          placeholder="URL Imagen..."
                          className="flex-1 h-8 px-2.5 rounded-lg border border-slate-800 bg-slate-955 text-slate-350 text-[10px] outline-none focus:border-[#22D3A6]"
                        />
                        {cloudinaryConfig.hasCredentials && (
                          <label className="h-8 px-2 rounded-lg bg-slate-800 hover:bg-slate-750 text-slate-200 text-[10px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer border border-slate-700 shrink-0">
                            <Upload size={10} />
                            <span>Subir</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (file) {
                                  try {
                                    toast.loading("Subiendo bloque imagen...");
                                    const url = await uploadToCloudinary(file, token!);
                                    handleBlockFieldChange(currentSection?.id, idx, "url", url);
                                    toast.dismiss();
                                    toast.success("Imagen de bloque subida correctamente");
                                  } catch (err) {
                                    toast.dismiss();
                                    toast.error(err instanceof Error ? err.message : "Error al subir imagen");
                                  }
                                }
                              }}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  )}

                  {block.type === "product_card" && (
                    <input
                      type="text"
                      value={block.title || ""}
                      onChange={(e) => handleBlockFieldChange(currentSection?.id, idx, "title", e.target.value)}
                      placeholder="Título de la tarjeta..."
                      className="h-8 w-full px-2.5 rounded-lg border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
                    />
                  )}
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => addBlockType("text")}
                className="flex-1 h-8 border border-dashed border-slate-800 hover:border-[#22D3A6]/45 text-[9px] text-slate-400 hover:text-[#22D3A6] bg-transparent rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 font-bold uppercase tracking-wider"
              >
                <Plus size={10} />
                <span>+ Texto</span>
              </button>
              <button
                onClick={() => addBlockType("image")}
                className="flex-1 h-8 border border-dashed border-slate-800 hover:border-[#22D3A6]/45 text-[9px] text-slate-400 hover:text-[#22D3A6] bg-transparent rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 font-bold uppercase tracking-wider"
              >
                <Plus size={10} />
                <span>+ Imagen</span>
              </button>
              <button
                onClick={() => addBlockType("product_card")}
                className="flex-1 h-8 border border-dashed border-slate-800 hover:border-[#22D3A6]/45 text-[9px] text-slate-400 hover:text-[#22D3A6] bg-transparent rounded-lg cursor-pointer transition-all flex items-center justify-center gap-1 font-bold uppercase tracking-wider"
              >
                <Plus size={10} />
                <span>+ Prod</span>
              </button>
            </div>
          </div>
        )}

        {/* CHECKOUT / CART PROPERTIES */}
        {currentSection.type === "cart" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Título checkout</label>
              <input
                type="text"
                value={props.title || ""}
                onChange={(e) => handlePropertyChange("title", e.target.value)}
                className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6]"
              />
            </div>

            <div className="flex items-center justify-between py-1 border-y border-slate-900/40 my-1">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-350">Habilitar Reserva</span>
                <span className="text-[9px] text-slate-500 font-medium">Permite reservar físicamente</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={props.showReservations ?? true}
                  onChange={(e) => handlePropertyChange("showReservations", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22D3A6] peer-checked:after:bg-slate-950" />
              </label>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-900/40 my-1">
              <div className="flex flex-col">
                <span className="text-xs font-bold text-slate-350">Habilitar Tarjeta</span>
                <span className="text-[9px] text-slate-500 font-medium">Permite pagar vía Stripe</span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={props.showCardPayments ?? true}
                  onChange={(e) => handlePropertyChange("showCardPayments", e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22D3A6] peer-checked:after:bg-slate-955" />
              </label>
            </div>
          </div>
        )}

        {/* FOOTER PROPERTIES */}
        {currentSection.type === "footer" && (
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Texto de Derechos Reservados</label>
              <textarea
                value={props.copyrightText || ""}
                onChange={(e) => handlePropertyChange("copyrightText", e.target.value)}
                className="w-full h-16 p-2 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 text-xs outline-none focus:border-[#22D3A6] transition-all resize-none"
              />
            </div>
          </div>
        )}

        {/* Global style triggers for custom colors per section */}
        <div className="border-t border-slate-900 pt-4 mt-2 space-y-4">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">Estilos Propios de Sección</span>
          
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fondo Custom</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={props.backgroundColor || "#FFFFFF"}
                  onChange={(e) => handlePropertyChange("backgroundColor", e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent outline-none p-0 shrink-0"
                />
                <span className="text-[10px] font-bold font-mono text-slate-400">{props.backgroundColor || "transp"}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Texto Custom</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={props.textColor || "#0F172A"}
                  onChange={(e) => handlePropertyChange("textColor", e.target.value)}
                  className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent outline-none p-0 shrink-0"
                />
                <span className="text-[10px] font-bold font-mono text-slate-400">{props.textColor || "default"}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between py-1 border-y border-slate-900/40 my-1">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300">Glassmorphism</span>
              <span className="text-[9px] text-slate-500 font-medium">Fondo traslúcido estilizado</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={props.useGlassmorphism || false}
                onChange={(e) => handlePropertyChange("useGlassmorphism", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22D3A6] peer-checked:after:bg-slate-950" />
            </label>
          </div>

          {props.useGlassmorphism && (
            <div className="grid grid-cols-2 gap-3 animate-fade-in">
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Opacidad glass</span>
                  <span className="text-[#22D3A6] font-mono">{props.opacity ?? 30}%</span>
                </div>
                <input
                  type="range"
                  min="5"
                  max="95"
                  value={props.opacity ?? 30}
                  onChange={(e) => handlePropertyChange("opacity", parseInt(e.target.value))}
                  className="w-full accent-[#22D3A6] h-1.5 rounded-lg bg-slate-900 outline-none cursor-pointer border-none"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                  <span>Desenfoque (blur)</span>
                  <span className="text-[#22D3A6] font-mono">{props.blur ?? 12}px</span>
                </div>
                <input
                  type="range"
                  min="2"
                  max="32"
                  value={props.blur ?? 12}
                  onChange={(e) => handlePropertyChange("blur", parseInt(e.target.value))}
                  className="w-full accent-[#22D3A6] h-1.5 rounded-lg bg-slate-900 outline-none cursor-pointer border-none"
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between py-1 border-b border-slate-900/40 my-1">
            <div className="flex flex-col">
              <span className="text-xs font-bold text-slate-300">Sombras de Texto</span>
              <span className="text-[9px] text-slate-500 font-medium">Sombra para mejorar legibilidad</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer select-none">
              <input
                type="checkbox"
                checked={props.textShadow || false}
                onChange={(e) => handlePropertyChange("textShadow", e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22D3A6] peer-checked:after:bg-slate-955" />
            </label>
          </div>
        </div>

        {/* DELETE SECTION BUTTON */}
        {!["header", "footer"].includes(currentSection?.id) && (
          <div className="border-t border-slate-900 pt-4 mt-2">
            <button
              onClick={handleDeleteSection}
              className="w-full h-11 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 hover:border-rose-500/45 rounded-xl cursor-pointer transition-all flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider"
            >
              <Trash2 size={14} />
              <span>Eliminar Sección</span>
            </button>
          </div>
        )}
          </>
        ) : null}
      </div>
    </>
  );

  function addBlockType(blockType: "text" | "image" | "product_card") {
    if (!currentSection) return;
    handleAddBlock(currentSection.id, blockType);
    toast.success(`Bloque de ${blockType} añadido`);
  }
}
