"use client";

import type { StoreConfig } from "@/types/store-builder";
import type { TiendaDto as BuilderTiendaDto } from "@/lib/api/admin";

import React from "react";
import {
  Plus,
  Trash2,
  FilePlus,
  FileText,
  GripVertical,
  Settings,
  X,
  Upload,
  Download,
  Sparkles,
  ArrowLeft,
  Save,
  Eye,
  History,
  Undo2,
  Redo2,
  Monitor,
  Tablet,
  Smartphone,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { PortalModal } from "@/components/ui/PortalModal";

interface ConstructorLeftPanelProps {
  dirtyPageIds: Set<string>;
  storeConfig: StoreConfig | null;
  setStoreConfig: React.Dispatch<React.SetStateAction<StoreConfig | null>>;
  activePageId: string;
  setActivePageId: (id: string) => void;
  selectedSectionId: string;
  setSelectedSectionId: (id: string) => void;
  leftTab: "sections" | "theme";
  setLeftTab: (tab: "sections" | "theme") => void;
  showLeftPanel: boolean;
  setShowLeftPanel: (show: boolean) => void;
  isCreatePageModalOpen: boolean;
  setIsCreatePageModalOpen: (open: boolean) => void;
  isAddSectionModalOpen: boolean;
  setIsAddSectionModalOpen: (open: boolean) => void;
  draggedSectionId: string | null;
  newPageName: string;
  setNewPageName: (name: string) => void;
  newSectionName: string;
  setNewSectionName: (name: string) => void;
  newSectionType: string;
  setNewSectionType: (type: string) => void;
  activeStore: BuilderTiendaDto | null;
  token?: string | null;
  handleCreatePage: (e: React.FormEvent) => void;
  handleAddSection: (e: React.FormEvent) => void;
  handleDeletePage: (id: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleDragOver: (e: React.DragEvent, id: string) => void;
  handleDrop: (e: React.DragEvent, targetId: string) => void;

  // Header options relocated to Left Sidebar
  onNavigateBack?: () => void;
  handlePublishConfig?: () => void;
  isPublishingConfig?: boolean;
  hasUnsavedChanges?: boolean;
  undo?: () => void;
  redo?: () => void;
  canUndo?: boolean;
  canRedo?: boolean;
  setShowHistoryPanel?: (open: boolean) => void;
  previewDevice?: "desktop" | "tablet" | "mobile";
  setPreviewDevice?: (dev: "desktop" | "tablet" | "mobile") => void;
  setShowRightPanel?: (show: boolean) => void;
  onOpenAgent?: () => void;
}

export function ConstructorLeftPanel({
  dirtyPageIds,
  storeConfig,
  setStoreConfig,
  activePageId,
  setActivePageId,
  selectedSectionId,
  setSelectedSectionId,
  leftTab,
  setLeftTab,
  showLeftPanel,
  setShowLeftPanel,
  isCreatePageModalOpen,
  setIsCreatePageModalOpen,
  isAddSectionModalOpen,
  setIsAddSectionModalOpen,
  draggedSectionId,
  newPageName,
  setNewPageName,
  newSectionName,
  setNewSectionName,
  newSectionType,
  setNewSectionType,
  activeStore,
  token,
  handleCreatePage,
  handleAddSection,
  handleDeletePage,
  handleDragStart,
  handleDragOver,
  handleDrop,
  onNavigateBack,
  handlePublishConfig,
  isPublishingConfig,
  hasUnsavedChanges,
  undo,
  redo,
  canUndo,
  canRedo,
  setShowHistoryPanel,
  previewDevice = "desktop",
  setPreviewDevice,
  setShowRightPanel,
  onOpenAgent
}: ConstructorLeftPanelProps) {
  if (!storeConfig) return null;
  const theme = storeConfig.theme || {
    backgroundColor: "#F8FAFC",
    accentColor: "#1AB38C",
    backgroundGradient: "linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)",
    useGradient: false
  };

  const handleThemeChange = (field: string, val: unknown) => {
    setStoreConfig((prev) => prev ? ({
      ...prev,
      theme: {
        ...theme,
        [field]: val
      }
    }) : prev);
  };

  const gradientPresets = [
    { name: "Océano Profundo", css: "linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)" },
    { name: "Atardecer Místico", css: "linear-gradient(135deg, #fc5c7d 0%, #6a82fb 100%)" },
    { name: "Bosque Mágico", css: "linear-gradient(135deg, #11998e 0%, #38ef7d 100%)" },
    { name: "Nebulosa Violeta", css: "linear-gradient(135deg, #654ea3 0%, #eaafc8 100%)" },
    { name: "Gris Premium", css: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)" }
  ];

  const exportConfig = () => {
    const jsonStr = JSON.stringify(storeConfig, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `config_diseno_${activeStore?.slug || "tienda"}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Configuración de diseño exportada.");
  };

  const importConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed.pages && !parsed.sections) {
          toast.error("El archivo JSON no es una configuración visual de tienda válida.");
          return;
        }
        
        if (!parsed.theme) {
          parsed.theme = {
            backgroundColor: "#F8FAFC",
            accentColor: "#1AB38C",
            backgroundGradient: "linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)",
            useGradient: false
          };
        }

        setStoreConfig(parsed);
        if (parsed.currentPageId) {
          setActivePageId(parsed.currentPageId);
        }
        toast.success("Diseño importado correctamente.");
      } catch (err) {
        toast.error("Error al leer el archivo JSON.");
      }
    };
    reader.readAsText(file);
  };

  const currentPage = storeConfig.pages.find((p) => p.id === activePageId) || storeConfig.pages[0];

  return (
    <>
      {showLeftPanel && (
        <div className="fixed inset-0 z-35 bg-black/60 xl:hidden animate-fade-in" onClick={() => setShowLeftPanel(false)} />
      )}
      <div className={`
        rounded-2xl border border-slate-900 bg-slate-955 p-4 flex flex-col gap-3.5 overflow-y-auto sidebar-scrollbar select-none transition-all duration-300
        w-80 xl:w-80 shrink-0 xl:static xl:flex xl:h-auto xl:max-h-none
        fixed inset-y-0 left-0 z-40 bg-slate-950 border-r border-slate-900 shadow-2xl h-[100dvh] max-h-[100dvh]
        ${showLeftPanel ? "flex translate-x-0" : "hidden xl:flex -translate-x-full xl:translate-x-0"}
      `}>
        {/* Top Control Center: Portal Back & Active Store */}
        <div className="flex items-center justify-between border-b border-slate-900/80 pb-3 shrink-0">
          <button
            type="button"
            onClick={onNavigateBack}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-900 px-2.5 py-1.5 rounded-xl border border-slate-800 transition-all cursor-pointer"
            title="Volver al Portal"
          >
            <ArrowLeft size={13} />
            <span>Volver</span>
          </button>

          <div className="flex items-center gap-1.5 min-w-0">
            <div className="w-2 h-2 rounded-full bg-[#22D3A6] animate-pulse shrink-0" />
            <span className="text-xs font-black text-white truncate max-w-[130px]">
              {activeStore?.nombre || "Constructor"}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setShowLeftPanel(false)}
            className="xl:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all border-none bg-transparent cursor-pointer"
            title="Cerrar menú"
          >
            <X size={15} />
          </button>
        </div>

        {/* Primary CTA: Guardar y Publicar */}
        <div className="flex flex-col gap-2 shrink-0">
          <button
            type="button"
            onClick={handlePublishConfig}
            disabled={isPublishingConfig}
            className="w-full h-10 rounded-xl bg-linear-to-r from-[#22D3A6] to-[#38BDF8] text-slate-950 text-xs font-black shadow-[0_4px_15px_rgba(34,211,166,0.2)] hover:brightness-110 active:scale-[0.99] cursor-pointer border-none transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isPublishingConfig ? (
              <>
                <Loader2 className="animate-spin" size={15} />
                <span>Publicando cambios...</span>
              </>
            ) : (
              <>
                <Save size={15} />
                <span>Guardar y Publicar</span>
              </>
            )}
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[10px] font-semibold py-0.5">
            {hasUnsavedChanges ? (
              <>
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                <span className="text-amber-400">Cambios sin guardar</span>
              </>
            ) : (
              <span className="text-slate-500">Sin cambios pendientes</span>
            )}
          </div>

          {/* Secondary Actions: Ver Tienda Live & Historial */}
          <div className="grid grid-cols-2 gap-2">
            <a
              href={activeStore?.slug ? `https://${activeStore.slug}.${process.env.NEXT_PUBLIC_MAIN_DOMAIN || "dmhub.fun"}` : `/preview/${activeStore?.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="h-8 px-2 rounded-xl bg-slate-900/80 hover:bg-slate-850 border border-slate-800 text-slate-300 hover:text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 no-underline"
              title="Ver Tienda Completa en Vivo"
            >
              <Eye size={13} className="text-[#38BDF8]" />
              <span>Ver Tienda</span>
            </a>

            <button
              type="button"
              onClick={() => setShowHistoryPanel?.(true)}
              className="h-8 px-2 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-850 text-slate-300 hover:text-white text-[11px] font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              title="Historial de versiones"
            >
              <History size={13} className="text-[#38BDF8]" />
              <span>Historial</span>
            </button>
          </div>
        </div>

        {/* Quick Utilities Bar: Undo/Redo + Viewport Device Switcher */}
        <div className="flex items-center justify-between p-1.5 rounded-xl border border-slate-900 bg-slate-900/50 shrink-0">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={undo}
              disabled={!canUndo}
              title="Deshacer (Ctrl+Z)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 bg-transparent border-none cursor-pointer transition-colors"
            >
              <Undo2 size={14} />
            </button>
            <button
              type="button"
              onClick={redo}
              disabled={!canRedo}
              title="Rehacer (Ctrl+Y)"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:text-slate-400 bg-transparent border-none cursor-pointer transition-colors"
            >
              <Redo2 size={14} />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setPreviewDevice?.("desktop")}
              className={`p-1.5 rounded-lg cursor-pointer border-none transition-all ${
                previewDevice === "desktop" ? "bg-[#22D3A6] text-slate-950 font-bold shadow-xs" : "text-slate-400 hover:text-white bg-transparent"
              }`}
              title="Vista Escritorio"
            >
              <Monitor size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice?.("tablet")}
              className={`p-1.5 rounded-lg cursor-pointer border-none transition-all ${
                previewDevice === "tablet" ? "bg-[#22D3A6] text-slate-950 font-bold shadow-xs" : "text-slate-400 hover:text-white bg-transparent"
              }`}
              title="Vista Tableta"
            >
              <Tablet size={14} />
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice?.("mobile")}
              className={`p-1.5 rounded-lg cursor-pointer border-none transition-all ${
                previewDevice === "mobile" ? "bg-[#22D3A6] text-slate-950 font-bold shadow-xs" : "text-slate-400 hover:text-white bg-transparent"
              }`}
              title="Vista Móvil"
            >
              <Smartphone size={14} />
            </button>
          </div>
        </div>

        {/* Botón Agente */}
        <button
          type="button"
          onClick={() => onOpenAgent?.()}
          className="w-full h-10 px-3.5 rounded-xl text-xs font-bold cursor-pointer border border-[#22D3A6]/40 bg-slate-900/80 hover:bg-[#22D3A6]/10 text-white hover:border-[#22D3A6] transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm group"
          title="Agente"
        >
          <Sparkles size={14} className="text-[#22D3A6] group-hover:rotate-12 transition-transform" />
          <span className="font-bold text-white group-hover:text-[#22D3A6] transition-colors">Agente</span>
        </button>

        {/* 2-column Tab Switcher: Secciones / Diseño */}
        <div className="grid grid-cols-2 gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-900 shrink-0">
          <button
            type="button"
            onClick={() => {
              setLeftTab("sections");
              if (currentPage?.sections?.length > 0) {
                setSelectedSectionId(currentPage.sections[0].id);
                setShowRightPanel?.(true);
              }
            }}
            className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer border-none transition-all ${
              leftTab === "sections" ? "bg-slate-800 text-white shadow-md" : "text-slate-400 hover:text-white bg-transparent"
            }`}
          >
            Secciones
          </button>
          <button
            type="button"
            onClick={() => {
              setLeftTab("theme");
              setSelectedSectionId("theme-settings");
              setShowRightPanel?.(false);
            }}
            className={`py-1.5 rounded-lg text-xs font-bold cursor-pointer border-none transition-all ${
              leftTab === "theme" ? "bg-slate-800 text-white shadow-md" : "text-slate-400 hover:text-white bg-transparent"
            }`}
          >
            Diseño
          </button>
        </div>

        {leftTab === "sections" && (
          <>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-2 text-left">
              Estructura de la Tienda
            </span>
            
            <div className="flex flex-col gap-1.5">
              {currentPage.sections.map((section) => {
                const isSelected = selectedSectionId === section.id;
                const isShared = ["header", "footer"].includes(section.id);
                return (
                  <div
                    key={section.id}
                    onClick={() => {
                      setSelectedSectionId(section.id);
                      setShowRightPanel?.(true);
                    }}
                    draggable={!isShared}
                    onDragStart={(e) => handleDragStart(e, section.id)}
                    onDragOver={(e) => handleDragOver(e, section.id)}
                    onDrop={(e) => handleDrop(e, section.id)}
                    className={`flex items-center justify-between p-3 rounded-xl cursor-pointer border transition-all ${
                      isSelected
                        ? "bg-slate-900 border-[#22D3A6] text-white shadow-[0_2px_8px_rgba(34,211,166,0.1)]"
                        : "bg-slate-955/40 border-transparent hover:bg-slate-900/40 text-slate-400 hover:text-slate-200"
                    } ${draggedSectionId === section.id ? "opacity-30 border-dashed border-[#38BDF8]" : ""}`}
                  >
                    <div className="flex items-center gap-2 max-w-[130px]">
                      {!isShared && (
                        <GripVertical size={13} className="text-slate-600 shrink-0 cursor-grab active:cursor-grabbing hover:text-slate-400" />
                      )}
                      <span className="text-xs font-semibold truncate">{section.name}</span>
                    </div>
                    <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-slate-900 text-slate-500 shrink-0">
                      {section.type}
                    </span>
                  </div>
                );
              })}
            </div>
            
            <button
              type="button"
              onClick={() => setIsAddSectionModalOpen(true)}
              className="w-full h-11 my-4 flex items-center justify-center gap-2 text-xs font-bold text-[#22D3A6] hover:text-white border border-dashed border-[#22D3A6]/40 hover:border-[#22D3A6] bg-[#22D3A6]/5 hover:bg-[#22D3A6]/15 rounded-xl cursor-pointer transition-all uppercase tracking-wide"
            >
              <Plus size={15} />
              <span>Agregar Sección</span>
            </button>

            {/* Pages Management Section */}
            <div className="border-t border-slate-900 pt-5 mt-4 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-left">
                Páginas del Sitio
              </span>
              <div className="flex flex-col gap-1">
                {storeConfig.pages.map((p) => {
                  const isActive = p.id === activePageId;
                  return (
                    <div
                      key={p.id}
                      onClick={() => {
                        setActivePageId(p.id);
                        if (p.sections.length > 0) {
                          setSelectedSectionId(p.sections[0].id);
                          setShowRightPanel?.(true);
                        }
                      }}
                      className={`flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-xl transition-all cursor-pointer w-full ${
                        isActive ? "text-[#22D3A6] bg-slate-900/60" : "text-slate-400 hover:bg-slate-900/20 hover:text-white bg-transparent"
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                        <FileText size={12} className={isActive ? "text-[#22D3A6]" : "text-slate-500"} />
                        <span className="truncate">{p.name}</span>
                        {dirtyPageIds.has(p.id) && (
                          <span title="Cambios sin guardar" className="flex shrink-0">
                            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-400" />
                            <span className="sr-only">Cambios sin guardar</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {p.isHome ? (
                          <span className="text-[8px] font-bold text-slate-500 bg-slate-900 px-1 py-0.5 rounded">HOME</span>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePage(p.id);
                            }}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors border-none bg-transparent cursor-pointer"
                            title="Eliminar página"
                          >
                            <Trash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setIsCreatePageModalOpen(true)}
                className="w-full h-10 flex items-center justify-center gap-2 text-xs font-bold text-[#38BDF8] hover:text-white border border-dashed border-[#38BDF8]/40 hover:border-[#38BDF8] bg-[#38BDF8]/5 hover:bg-[#38BDF8]/15 rounded-xl cursor-pointer transition-all uppercase tracking-wide"
              >
                <FilePlus size={15} />
                <span>Agregar Página</span>
              </button>
            </div>
          </>
        )}

        {leftTab === "theme" && (
          <div className="flex flex-col gap-3 text-left">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-2">
              Tema y Apariencia
            </span>
            <div
              onClick={() => setSelectedSectionId("theme-settings")}
              className={`flex items-center gap-2.5 p-3 rounded-xl cursor-pointer border transition-all ${
                selectedSectionId === "theme-settings"
                  ? "bg-slate-900 border-[#22D3A6] text-white shadow-[0_2px_8px_rgba(34,211,166,0.1)]"
                  : "bg-slate-955/40 border-transparent hover:bg-slate-900/40 text-slate-400 hover:text-slate-200"
              }`}
            >
              <Settings size={14} className="text-[#22D3A6]" />
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-bold text-white">Ajustes Globales</span>
                <span className="text-[9px] text-slate-500">Colores, fondos y exportación</span>
              </div>
            </div>

            {selectedSectionId === "theme-settings" && (
              <div className="flex flex-col gap-5 text-left pt-2 border-t border-slate-900/50">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Color de Acento</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={theme.accentColor}
                      onChange={(e) => handleThemeChange("accentColor", e.target.value)}
                      className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent outline-none p-0 shrink-0"
                    />
                    <span className="text-[10px] font-bold font-mono text-slate-400">{theme.accentColor}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-y border-slate-900/40 my-1">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-slate-350">Usar Degradado</span>
                    <span className="text-[9px] text-slate-500">Activa degradado de fondo</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={theme.useGradient}
                      onChange={(e) => handleThemeChange("useGradient", e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22D3A6] peer-checked:after:bg-slate-955" />
                  </label>
                </div>

                {!theme.useGradient ? (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Color de Fondo Plano</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={theme.backgroundColor}
                        onChange={(e) => handleThemeChange("backgroundColor", e.target.value)}
                        className="w-8 h-8 rounded-lg cursor-pointer border-none bg-transparent outline-none p-0 shrink-0"
                      />
                      <span className="text-[10px] font-bold font-mono text-slate-400">{theme.backgroundColor}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Degradado CSS</label>
                      <textarea
                        value={theme.backgroundGradient}
                        onChange={(e) => handleThemeChange("backgroundGradient", e.target.value)}
                        placeholder="linear-gradient(135deg, ...)"
                        className="w-full h-16 p-2 rounded-xl border border-slate-800 bg-slate-955 text-slate-300 font-mono text-[10px] outline-none focus:border-[#22D3A6] transition-all resize-none"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Presets</span>
                      <div className="grid grid-cols-1 gap-1.5 max-h-32 overflow-y-auto pr-1">
                        {gradientPresets.map((preset, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleThemeChange("backgroundGradient", preset.css)}
                            className="text-left p-1.5 rounded-lg border border-slate-850 hover:border-slate-800 bg-slate-955/20 text-[9px] text-slate-350 hover:text-white flex items-center gap-2 transition-all cursor-pointer"
                          >
                            <div style={{ backgroundImage: preset.css }} className="w-4 h-4 rounded shrink-0 border border-slate-800" />
                            <span className="font-semibold truncate">{preset.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="border-t border-slate-900 pt-4 mt-2 space-y-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block">
                    Plantilla de Diseño
                  </span>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={exportConfig}
                      className="w-full h-9 flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#38BDF8] border border-[#38BDF8]/20 bg-[#38BDF8]/5 hover:bg-[#38BDF8]/10 rounded-xl cursor-pointer transition-all uppercase tracking-wider"
                    >
                      <Download size={12} />
                      <span>Exportar JSON</span>
                    </button>

                    <label className="w-full h-9 flex items-center justify-center gap-1.5 text-[10px] font-bold text-[#22D3A6] border border-[#22D3A6]/20 bg-[#22D3A6]/5 hover:bg-[#22D3A6]/10 rounded-xl cursor-pointer transition-all uppercase tracking-wider text-center">
                      <Upload size={12} />
                      <span>Importar JSON</span>
                      <input
                        type="file"
                        accept=".json"
                        onChange={importConfig}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* CREATE PAGE MODAL */}
      {isCreatePageModalOpen && (
        <PortalModal onClose={() => setIsCreatePageModalOpen(false)} ariaLabel="Agregar página">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setIsCreatePageModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white cursor-pointer bg-transparent border-none p-0"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Agregar Página</h3>
              <p className="text-xs text-slate-400">Ingresa el título de la página personalizada</p>
            </div>

            <form onSubmit={handleCreatePage} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre de la Página</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Quiénes Somos"
                  value={newPageName}
                  onChange={(e) => setNewPageName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-[#38BDF8]"
                />
              </div>

              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 font-bold transition-all cursor-pointer border-none flex items-center justify-center"
              >
                <span>Crear Página</span>
              </button>
            </form>
          </div>
        </PortalModal>
      )}

      {/* ADD SECTION MODAL */}
      {isAddSectionModalOpen && (
        <PortalModal onClose={() => setIsAddSectionModalOpen(false)} ariaLabel="Agregar sección">
          <div className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6 relative animate-fade-in">
            <button
              onClick={() => setIsAddSectionModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white cursor-pointer bg-transparent border-none p-0"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-base font-black text-white">Agregar Sección</h3>
              <p className="text-xs text-slate-400">Selecciona el tipo de sección para agregar a la página</p>
            </div>

            <form onSubmit={handleAddSection} className="space-y-4">
              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold">Nombre Sección</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Ofertas del Mes"
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 placeholder:text-slate-600 outline-none focus:border-[#38BDF8]"
                />
              </div>

              <div className="flex flex-col gap-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-semibold">Tipo de Sección</label>
                <select
                  value={newSectionType}
                  onChange={(e) => setNewSectionType(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8] cursor-pointer"
                >
                  <option value="custom">Bloques Personalizados (Texto/Imagen/Producto)</option>
                  <option value="hero">Hero Banner (Fondo, Botones)</option>
                  <option value="products">Lista de Productos (Grid o Carrusel)</option>
                  <option value="richtext">Bloque de Texto Enriquecido</option>
                  <option value="cart">Sección de Checkout (Carrito/Pagos)</option>
                  <option value="announcement">Barra de Anuncios</option>
                </select>
              </div>

              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 font-bold transition-all cursor-pointer border-none flex items-center justify-center"
              >
                <span>Añadir Sección</span>
              </button>
            </form>
          </div>
        </PortalModal>
      )}
    </>
  );
}
