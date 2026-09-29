"use client";

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
  Download
} from "lucide-react";
import { toast } from "sonner";
import { PortalModal } from "@/components/ui/PortalModal";

interface ConstructorLeftPanelProps {
  dirtyPageIds: Set<string>;
  storeConfig: any;
  setStoreConfig: React.Dispatch<React.SetStateAction<any>>;
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
  activeStore: any;
  handleCreatePage: (e: React.FormEvent) => void;
  handleAddSection: (e: React.FormEvent) => void;
  handleDeletePage: (id: string) => void;
  handleDragStart: (e: React.DragEvent, id: string) => void;
  handleDragOver: (e: React.DragEvent, id: string) => void;
  handleDrop: (e: React.DragEvent, targetId: string) => void;
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
  handleCreatePage,
  handleAddSection,
  handleDeletePage,
  handleDragStart,
  handleDragOver,
  handleDrop
}: ConstructorLeftPanelProps) {
  const theme = storeConfig.theme || {
    backgroundColor: "#F8FAFC",
    accentColor: "#1AB38C",
    backgroundGradient: "linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)",
    useGradient: false
  };

  const handleThemeChange = (field: string, val: any) => {
    setStoreConfig((prev: any) => ({
      ...prev,
      theme: {
        ...theme,
        [field]: val
      }
    }));
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

  const currentPage = storeConfig.pages.find((p: any) => p.id === activePageId) || storeConfig.pages[0];

  return (
    <>
      {showLeftPanel && (
        <div className="fixed inset-0 z-35 bg-black/60 backdrop-blur-xs xl:hidden animate-fade-in" onClick={() => setShowLeftPanel(false)} />
      )}
      <div className={`
        rounded-xl border border-slate-900 bg-slate-955/40 p-4 flex-col gap-4 overflow-y-auto sidebar-scrollbar select-none transition-all duration-300
        xl:w-64 xl:static xl:flex xl:h-auto xl:max-h-none
        fixed inset-y-0 left-0 z-40 w-72 bg-slate-950/95 border-r shadow-2xl h-[100dvh] max-h-[100dvh]
        ${showLeftPanel ? "flex translate-x-0" : "hidden xl:flex -translate-x-full xl:translate-x-0"}
      `}>
        {/* Left Tab Switcher */}
        <div className="grid grid-cols-2 gap-2 bg-slate-900/60 p-1 rounded-xl border border-slate-900 shrink-0">
          <button
            onClick={() => {
              setLeftTab("sections");
              if (currentPage?.sections?.length > 0) {
                setSelectedSectionId(currentPage.sections[0].id);
              }
            }}
            className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all ${
              leftTab === "sections" ? "bg-slate-800 text-white shadow-md" : "text-slate-400 hover:text-white bg-transparent"
            }`}
          >
            Secciones
          </button>
          <button
            onClick={() => {
              setLeftTab("theme");
              setSelectedSectionId("theme-settings");
            }}
            className={`py-1.5 rounded-lg text-[10px] font-bold cursor-pointer border-none transition-all ${
              leftTab === "theme" ? "bg-slate-800 text-white shadow-md" : "text-slate-400 hover:text-white bg-transparent"
            }`}
          >
            Diseño Global
          </button>
        </div>

        {leftTab === "sections" ? (
          <>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-900 pb-2 text-left">
              Estructura de la Tienda
            </span>
            
            <div className="flex flex-col gap-1.5">
              {currentPage.sections.map((section: any) => {
                const isSelected = selectedSectionId === section.id;
                const isShared = ["header", "footer"].includes(section.id);
                return (
                  <div
                    key={section.id}
                    onClick={() => setSelectedSectionId(section.id)}
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
              onClick={() => setIsAddSectionModalOpen(true)}
              className="w-full h-9 flex items-center justify-center gap-1.5 text-[9px] font-bold text-[#22D3A6]/80 hover:text-[#22D3A6] border border-dashed border-[#22D3A6]/30 hover:border-[#22D3A6]/60 bg-transparent rounded-xl cursor-pointer transition-all uppercase tracking-wider"
            >
              <Plus size={12} />
              <span>Agregar Sección</span>
            </button>

            {/* Pages Management Section */}
            <div className="border-t border-slate-900 pt-4 mt-2 space-y-3">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block text-left">
                Páginas del Sitio
              </span>
              <div className="flex flex-col gap-1">
                {storeConfig.pages.map((p: any) => {
                  const isActive = p.id === activePageId;
                  return (
                    <button
                      key={p.id}
                      onClick={() => {
                        setActivePageId(p.id);
                        if (p.sections.length > 0) {
                          setSelectedSectionId(p.sections[0].id);
                        }
                      }}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl transition-all text-left border-none cursor-pointer w-full ${
                        isActive ? "text-[#22D3A6] bg-slate-900/60" : "text-slate-400 hover:bg-slate-900/20 hover:text-white bg-transparent"
                      }`}
                    >
                      <FileText size={12} className={isActive ? "text-[#22D3A6]" : "text-slate-500"} />
                      <span className="truncate flex-1">{p.name}</span>
                      {dirtyPageIds.has(p.id) && (
                        <span title="Cambios sin guardar" className="flex shrink-0">
                          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-400" />
                          <span className="sr-only">Cambios sin guardar</span>
                        </span>
                      )}
                      {p.isHome && <span className="text-[8px] font-bold text-slate-500 bg-slate-900 px-1 py-0.5 rounded">HOME</span>}
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setIsCreatePageModalOpen(true)}
                className="w-full h-9 flex items-center justify-center gap-1.5 text-[9px] font-bold text-[#38BDF8]/80 hover:text-[#38BDF8] border border-dashed border-[#38BDF8]/30 hover:border-[#38BDF8]/60 bg-transparent rounded-xl cursor-pointer transition-all uppercase tracking-wider"
              >
                <FilePlus size={12} />
                <span>Agregar Página</span>
              </button>
            </div>
          </>
        ) : (
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
