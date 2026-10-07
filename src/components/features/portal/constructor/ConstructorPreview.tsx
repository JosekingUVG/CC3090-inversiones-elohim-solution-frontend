"use client";

import type { StoreConfig, SectionProperties } from "@/types/store-builder";
import type { TiendaDto as BuilderTiendaDto } from "@/lib/api/admin";

import { STORE_LAYOUT } from "@/components/features/portal/constructor/storeLayout";

import React from "react";
import { Store, ShoppingCart, ShoppingBag, Search, X } from "lucide-react";

interface ConstructorPreviewProps {
  storeConfig: StoreConfig | null;
  activePageId: string;
  setActivePageId: (id: string) => void;
  selectedSectionId: string;
  setSelectedSectionId: (id: string) => void;
  previewDevice: "desktop" | "tablet" | "mobile";
  activeStore: BuilderTiendaDto | null;
  constructorSearchTerm: string;
  setConstructorSearchTerm: (term: string) => void;
  setShowRightPanel?: (show: boolean) => void;
}

const isDarkBg = (bgColor: string) => {
  if (!bgColor) return false;
  if (bgColor === "transparent") return false;
  if (bgColor.startsWith("#")) {
    const hex = bgColor.replace("#", "");
    if (hex.length === 6) {
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq < 128;
    }
  }
  return false;
};

const getSectionStyle = (properties: SectionProperties) => {
  const styles: React.CSSProperties = {};
  if (!properties) return styles;

  const bgColor = properties.backgroundColor || "transparent";
  const textColor = properties.textColor || undefined;

  if (properties.useGlassmorphism) {
    let rgbaBg = "rgba(255, 255, 255, 0.15)";
    if (bgColor && bgColor.startsWith("#")) {
      const hex = bgColor.replace("#", "");
      const r = parseInt(hex.substring(0, 2), 16) || 255;
      const g = parseInt(hex.substring(2, 4), 16) || 255;
      const b = parseInt(hex.substring(4, 6), 16) || 255;
      const alpha = (properties.opacity ?? 30) / 100;
      rgbaBg = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    } else if (bgColor === "transparent") {
      const alpha = (properties.opacity ?? 30) / 100;
      rgbaBg = `rgba(255, 255, 255, ${alpha})`;
    } else {
      rgbaBg = bgColor;
    }
    
    styles.backgroundColor = rgbaBg;
    styles.border = "1px solid rgba(255, 255, 255, 0.2)";
    styles.boxShadow = "0 8px 32px 0 rgba(0, 0, 0, 0.1)";
  } else {
    if (bgColor !== "transparent") {
      if (bgColor.startsWith("#") && properties.opacity !== undefined && properties.opacity !== 100) {
        const hex = bgColor.replace("#", "");
        const r = parseInt(hex.substring(0, 2), 16) || 0;
        const g = parseInt(hex.substring(2, 4), 16) || 0;
        const b = parseInt(hex.substring(4, 6), 16) || 0;
        const alpha = properties.opacity / 100;
        styles.backgroundColor = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      } else {
        styles.backgroundColor = bgColor;
      }
    } else {
      styles.backgroundColor = "transparent";
    }
  }

  if (textColor) {
    styles.color = textColor;
  }

  if (properties.textShadow) {
    styles.textShadow = "0 2px 4px rgba(0,0,0,0.6)";
  }

  return styles;
};

export function ConstructorPreview({
  storeConfig,
  activePageId,
  setActivePageId,
  selectedSectionId,
  setSelectedSectionId,
  previewDevice,
  activeStore,
  constructorSearchTerm,
  setConstructorSearchTerm,
  setShowRightPanel
}: ConstructorPreviewProps) {
  if (!storeConfig) return null;
  const currentPage = storeConfig.pages.find((p) => p.id === activePageId) || storeConfig.pages[0];

  const handleSelectSection = (id: string) => {
    setSelectedSectionId(id);
    setShowRightPanel?.(true);
  };

  return (
    <div className="flex-1 rounded-xl border border-slate-900 bg-[#0c1622] p-6 flex items-center justify-center overflow-auto min-w-0 relative">
      <div
        className={`bg-slate-955 rounded-xl border border-slate-900 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 w-full h-full min-h-[400px] ${
          previewDevice === "mobile"
            ? "max-w-sm"
            : previewDevice === "tablet"
            ? "max-w-2xl"
            : "max-w-full"
        }`}
      >
        {/* Mock Browser Header Bar */}
        <div className="bg-slate-900/80 px-4 py-2 border-b border-slate-900/60 flex items-center gap-3 shrink-0">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
            <span className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
          </div>
          <div className="flex-1 bg-slate-955 rounded-md px-3 py-1 text-[10px] text-slate-500 font-mono text-center truncate">
            {activeStore?.slug}.dmhub.com
          </div>
        </div>

        {/* Previews scroll area */}
        <div
          style={{
            backgroundColor: storeConfig.theme?.useGradient ? undefined : (storeConfig.theme?.backgroundColor || "#FFFFFF"),
            backgroundImage: storeConfig.theme?.useGradient ? (storeConfig.theme?.backgroundGradient || "none") : "none",
            color: "#000000"
          }}
          className="flex-1 overflow-y-auto text-slate-900 flex flex-col font-sans select-none"
        >
          {currentPage.sections.map((section) => {
            const isSelected = selectedSectionId === section.id;
            const props = section.properties || {};
            const customStyle = getSectionStyle(props);
            const isDark = props.useGlassmorphism || isDarkBg(props.backgroundColor || "#FFFFFF");

            if (section.type === "announcement") {
              const announcementBg = props.backgroundColor || storeConfig.theme?.accentColor || "#1AB38C";
              return (
                <div
                  key={section.id}
                  onClick={() => handleSelectSection(section.id)}
                  style={{
                    backgroundColor: announcementBg,
                    color: props.textColor || "#FFFFFF",
                    padding: `${props.verticalPadding || 8}px 12px`,
                    fontWeight: props.fontWeight === "Bold" ? "bold" : "normal",
                    ...customStyle
                  }}
                  className={`text-center text-xs tracking-wider transition-all select-none relative cursor-pointer ${
                    isSelected ? "outline outline-2 outline-[#22D3A6] outline-offset-[-2px] z-30 animate-pulse" : ""
                  }`}
                >
                  <span>{props.bannerText || "Anuncio especial aquí..."}</span>
                </div>
              );
            }

            if (section.type === "header") {
              return (
                <header
                  key={section.id}
                  onClick={() => handleSelectSection(section.id)}
                  style={{
                    backgroundColor: props.backgroundColor || "#FFFFFF",
                    color: props.textColor || "#0F172A",
                    ...customStyle
                  }}
                  className={`${STORE_LAYOUT.section} border-b border-slate-200 ${previewDevice === "mobile" ? "py-2" : "py-4"} transition-all select-none relative cursor-pointer ${
                    isSelected ? "outline outline-2 outline-[#22D3A6] outline-offset-[-2px] z-30 animate-pulse" : ""
                  }`}
                >
                  <div className={`${STORE_LAYOUT.content} flex items-center justify-between`}>
                  <div className="flex items-center gap-2">
                    <Store size={18} style={{ color: props.textColor || "inherit" }} />
                    <span style={{ color: props.textColor || "inherit" }} className="font-black tracking-tight text-sm">
                      {props.storeName || "Mi Tienda"}
                    </span>
                  </div>
                  <nav className={`${previewDevice === "mobile" ? "hidden" : "flex"} items-center gap-6`}>
                    {storeConfig.pages.map((p) => (
                      <span
                        key={p.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePageId(p.id);
                          const targetPage = storeConfig.pages.find((page) => page.id === p.id);
                          if (targetPage && targetPage.sections.length > 0) {
                            setSelectedSectionId(targetPage.sections[0].id);
                          }
                        }}
                        style={{
                          color: p.id === activePageId ? (storeConfig.theme?.accentColor || "#1AB38C") : (props.textColor || "#64748B"),
                          borderBottomColor: p.id === activePageId ? (storeConfig.theme?.accentColor || "#1AB38C") : "transparent",
                          borderBottomWidth: p.id === activePageId ? 2 : 0,
                          borderBottomStyle: p.id === activePageId ? "solid" : "none"
                        }}
                        className="text-xs font-bold cursor-pointer transition-colors pb-0.5"
                      >
                        {p.name}
                      </span>
                    ))}
                  </nav>
                  <div style={{ color: props.textColor || "inherit" }} className="flex items-center gap-4">
                    <ShoppingCart size={16} />
                  </div>
                  </div>
                </header>
              );
            }

            if (section.type === "hero") {
              const theme = storeConfig.theme;
              const hasImage = !!props.backgroundImage;
              const heroStyle: React.CSSProperties = {
                color: props.textColor || "#FFFFFF",
                ...(hasImage
                  ? {
                      backgroundImage: `url(${props.backgroundImage})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }
                  : {}),
                ...customStyle
              };
              if (!hasImage && !props.useGlassmorphism && !props.backgroundColor) {
                if (theme?.useGradient) {
                  heroStyle.backgroundImage = theme.backgroundGradient || "none";
                } else {
                  heroStyle.backgroundColor = theme?.backgroundColor || "#0F172A";
                }
              }
              return (
                <section
                  key={section.id}
                  onClick={() => handleSelectSection(section.id)}
                  style={heroStyle}
                  className={`${STORE_LAYOUT.section} relative cursor-pointer ${previewDevice === "mobile" ? "py-8 min-h-[180px]" : "py-16 min-h-[260px]"} text-center flex flex-col items-center justify-center transition-all select-none ${
                    isSelected ? "outline outline-2 outline-[#22D3A6] outline-offset-[-2px] z-30 animate-pulse" : ""
                  }`}
                >
                  {hasImage && (
                    <div 
                      style={{ backgroundColor: `rgba(0, 0, 0, ${(props.overlayOpacity ?? 60) / 100})` }} 
                      className="absolute inset-0 pointer-events-none" 
                    />
                  )}
                  
                  <div className={`${STORE_LAYOUT.content} relative z-10 space-y-4`}>
                    <h2 className={`${previewDevice === "mobile" ? "text-lg" : "text-2xl sm:text-3xl"} font-black tracking-tight leading-tight text-white`}>
                      {props.title || "Título del Hero"}
                    </h2>
                    <p className={`${previewDevice === "mobile" ? "text-[10px] leading-snug" : "text-xs leading-relaxed"} text-slate-200/90`}>
                      {props.subtitle || "Subtítulo descriptivo de tu tienda o marca..."}
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                      {props.primaryButtonText && (
                        <button
                          style={{ backgroundColor: storeConfig.theme?.accentColor || "#1AB38C" }}
                          className="h-10 px-6 rounded-lg text-white font-bold text-xs cursor-pointer border-none shadow transition-all"
                        >
                          {props.primaryButtonText}
                        </button>
                      )}
                      {props.secondaryButtonText && (
                        <button className="h-10 px-6 rounded-lg bg-transparent border border-white text-white font-bold text-xs cursor-pointer hover:bg-white/10 transition-all">
                          {props.secondaryButtonText}
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              );
            }

            if (section.type === "products") {
              const gridColumns = previewDevice === "mobile"
                ? "grid-cols-1"
                : (props.columns === 2 ? "grid-cols-2" : props.columns === 4 ? "grid-cols-4" : "grid-cols-3");
              
              // No fallback/mock products are shown if database empty storefront was requested,
              // but in builder simulation we use standard templates to design layout.
              const simulatedMocks = [
                { name: "Precision watch", label: "HOT", price: "Q249.00", img: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80", desc: "Smartwatch deportivo con GPS y sensor de ritmo cardíaco." },
                { name: "Audio Hub Pro", label: "NEW", price: "Q599.00", img: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80", desc: "Audífonos premium con cancelación activa de ruido y audio HD." },
                { name: "Velocity X1", label: "TRENDING", price: "Q849.00", img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80", desc: "Tenis ultraligeros para alto rendimiento deportivo y running." }
              ];

              const filteredMocks = simulatedMocks.filter(p => {
                if (!props.showSearch || !constructorSearchTerm.trim()) return true;
                const term = constructorSearchTerm.toLowerCase();
                return p.name.toLowerCase().includes(term) || p.desc.toLowerCase().includes(term);
              }).slice(0, props.productsCount || 3);

              return (
                <section
                  key={section.id}
                  onClick={() => handleSelectSection(section.id)}
                  style={{
                    backgroundColor: props.backgroundColor || "#FFFFFF",
                    color: props.textColor || "#0F172A",
                    ...customStyle
                  }}
                  className={`${STORE_LAYOUT.section} cursor-pointer ${previewDevice === "mobile" ? "py-6" : "py-12"} transition-all select-none relative ${
                    isSelected ? "outline outline-2 outline-[#22D3A6] outline-offset-[-2px] z-30 animate-pulse" : ""
                  }`}
                >
                  <div className={`${STORE_LAYOUT.content} ${previewDevice === "mobile" ? "space-y-4" : "space-y-6"}`}>
                  <div 
                    style={{ borderBottomColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(241, 245, 249, 1)" }}
                    className="flex items-center justify-between border-b pb-3"
                  >
                    <div>
                      <h3 className="text-sm font-black uppercase tracking-wider text-left">
                        {props.title || "Productos Destacados"}
                      </h3>
                      {props.subtitle && (
                        <p className="text-[11px] text-slate-400 text-left mt-0.5 font-normal">
                          {props.subtitle}
                        </p>
                      )}
                    </div>
                    <span 
                      style={{ color: storeConfig.theme?.accentColor || "#1AB38C" }}
                      className="text-xs font-semibold hover:underline"
                    >
                      Ver todo
                    </span>
                  </div>

                  {props.showSearch && (
                    <div className="relative max-w-md mx-auto mb-4" onClick={(e) => e.stopPropagation()}>
                      <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                        <Search size={14} />
                      </div>
                      <input
                        type="text"
                        placeholder="Buscar productos..."
                        value={constructorSearchTerm}
                        onChange={(e) => setConstructorSearchTerm(e.target.value)}
                        style={{
                          backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#F8FAFC",
                          borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
                          color: isDark ? "#F8FAFC" : "#0F172A"
                        }}
                        className="w-full h-9 pl-9 pr-8 rounded-xl border text-[11px] outline-none focus:border-[#22D3A6] transition-all shadow-sm"
                      />
                      {constructorSearchTerm && (
                        <button
                          onClick={() => setConstructorSearchTerm("")}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  )}
                  
                  {props.layoutType === "list" ? (
                    <div className="space-y-3">
                      {filteredMocks.map((p, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(248, 250, 252, 0.5)",
                            borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(241, 245, 249, 1)"
                          }}
                          className="rounded-xl border p-3 flex gap-3"
                        >
                          <div className="h-16 w-16 sm:h-20 sm:w-20 bg-slate-200 rounded-lg overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                            <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                            <span className="absolute top-1.5 left-1.5 px-1 py-0.5 rounded bg-slate-900 text-white text-[6px] font-black tracking-wider uppercase">
                              {p.label}
                            </span>
                          </div>
                          <div className="flex-1 flex flex-col justify-between py-0.5 min-w-0 text-left">
                            <div className="space-y-0.5">
                              <h4 style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} className="text-[11px] font-bold truncate">{p.name}</h4>
                              <p style={{ color: isDark ? "#94A3B8" : "#64748B" }} className="text-[9px] line-clamp-1 leading-snug">{p.desc}</p>
                            </div>
                            <div className="flex items-center justify-between mt-1.5">
                              <span style={{ color: isDark ? "#F8FAFC" : "#334155" }} className="text-[11px] font-black">{p.price}</span>
                              <button 
                                style={{
                                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(226, 232, 240, 1)",
                                  color: isDark ? "#F8FAFC" : "#475569"
                                }}
                                className="h-6 px-2.5 rounded-lg transition-all border-none cursor-pointer flex items-center gap-1.5 text-[9px] font-bold"
                              >
                                <ShoppingCart size={10} />
                                <span>Añadir</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`grid gap-4 ${gridColumns}`}>
                      {filteredMocks.map((p, idx) => (
                        <div 
                          key={idx} 
                          style={{
                            backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(248, 250, 252, 0.5)",
                            borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(241, 245, 249, 1)"
                          }}
                          className="rounded-xl border p-3 flex flex-col gap-2.5 text-left"
                        >
                          <div className="aspect-square bg-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center">
                            <img src={p.img} alt={p.name} className="w-full h-full object-cover" />
                            <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[8px] font-black tracking-wider uppercase">
                              {p.label}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <h4 style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} className="text-[11px] font-bold truncate">{p.name}</h4>
                            <span style={{ color: isDark ? "#CBD5E1" : "#334155" }} className="text-xs font-black">{p.price}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  </div>
                </section>
              );
            }

            if (section.type === "richtext") {
              return (
                <section
                  key={section.id}
                  onClick={() => handleSelectSection(section.id)}
                  style={{
                    backgroundColor: props.backgroundColor || "#FFFFFF",
                    color: props.textColor || "#0F172A",
                    paddingTop: `${props.paddingVertical || 48}px`,
                    paddingBottom: `${props.paddingVertical || 48}px`,
                    ...customStyle
                  }}
                  className={`cursor-pointer px-6 text-center space-y-4 transition-all select-none relative ${
                    isSelected ? "outline outline-2 outline-[#22D3A6] outline-offset-[-2px] z-30 animate-pulse" : ""
                  }`}
                >
                  <div className="max-w-2xl mx-auto space-y-3">
                    {props.title && (
                      <h2 className="text-lg font-black tracking-tight leading-tight">
                        {props.title}
                      </h2>
                    )}
                    {props.content && (
                      <p className="text-xs leading-relaxed text-slate-500 font-medium">
                        {props.content}
                      </p>
                    )}
                  </div>
                </section>
              );
            }

            if (section.type === "custom") {
              const blocks = props.blocks || [];
              return (
                <section
                  key={section.id}
                  onClick={() => handleSelectSection(section.id)}
                  style={{
                    backgroundColor: props.backgroundColor || "#FFFFFF",
                    color: props.textColor || "#0F172A",
                    ...customStyle
                  }}
                  className={`cursor-pointer py-10 px-6 transition-all select-none relative ${
                    isSelected ? "outline outline-2 outline-[#22D3A6] outline-offset-[-2px] z-30 animate-pulse" : ""
                  }`}
                >
                  <div className="max-w-2xl mx-auto w-full flex flex-col gap-6">
                    {blocks.map((block) => {
                      if (block.type === "text") {
                        return (
                          <p 
                            key={block.id} 
                            style={{ color: props.textColor || "inherit" }} 
                            className="text-sm leading-relaxed text-center whitespace-pre-wrap"
                          >
                            {block.content || "Texto personalizado..."}
                          </p>
                        );
                      }
                      
                      if (block.type === "image") {
                        return (
                          <div key={block.id} className="w-full flex justify-center">
                            <img
                              src={block.url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80"}
                              alt="Custom Block"
                              className="max-w-full max-h-[300px] object-cover rounded-xl shadow-md"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&q=80";
                              }}
                            />
                          </div>
                        );
                      }
                      
                      if (block.type === "product_card") {
                        return (
                          <div 
                            key={block.id} 
                            style={{
                              backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "rgba(248, 250, 252, 0.5)",
                              borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(241, 245, 249, 1)"
                            }}
                            className="w-full max-w-[240px] mx-auto rounded-xl border p-3 flex flex-col gap-2.5 text-left"
                          >
                            <div className="aspect-square bg-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center">
                              <img src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=300&q=80" alt="Product" className="w-full h-full object-cover" />
                              <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[8px] font-black tracking-wider uppercase">
                                SELECT
                              </span>
                            </div>
                            <div className="flex flex-col gap-1 text-left">
                              <h4 style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} className="text-[11px] font-bold truncate">{block.title || "Tarjeta de Producto"}</h4>
                              <span style={{ color: isDark ? "#CBD5E1" : "#334155" }} className="text-xs font-black">Q299.00</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                    {blocks.length === 0 && (
                      <div className="text-center py-8 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-xs">
                        Sección vacía. Añade bloques de texto, imagen o producto desde el panel lateral.
                      </div>
                    )}
                  </div>
                </section>
              );
            }

            if (section.type === "cart") {
              return (
                <section
                  key={section.id}
                  onClick={() => handleSelectSection(section.id)}
                  style={{
                    backgroundColor: props.backgroundColor || "#FFFFFF",
                    color: props.textColor || "#0F172A",
                    ...customStyle
                  }}
                  className={`cursor-pointer py-12 px-6 flex flex-col gap-6 transition-all select-none relative ${
                    isSelected ? "outline outline-2 outline-[#22D3A6] outline-offset-[-2px] z-30 animate-pulse" : ""
                  }`}
                >
                  <div 
                    style={{
                      backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#F8FAFC",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                    }}
                    className="max-w-2xl mx-auto w-full border rounded-2xl p-6 space-y-4"
                  >
                    <h3 
                      style={{ 
                        color: isDark ? "#F8FAFC" : "#1E293B",
                        borderBottomColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                      }}
                      className="text-sm font-black border-b pb-2 flex items-center gap-2 text-left"
                    >
                      <ShoppingBag size={18} style={{ color: storeConfig.theme?.accentColor || "#1AB38C" }} />
                      <span>{props.title || "Carrito de Compras / Checkout"}</span>
                    </h3>
                    <div className="space-y-3">
                      <div 
                        style={{
                          backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#FFFFFF",
                          borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#F1F5F9"
                        }}
                        className="flex justify-between items-center p-3 rounded-xl border text-[10px]"
                      >
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-slate-150 rounded flex items-center justify-center text-slate-450 font-bold">Img</div>
                          <div className="text-left">
                            <div style={{ color: isDark ? "#F8FAFC" : "#334155" }} className="font-bold">Producto de Demostración</div>
                            <div style={{ color: isDark ? "#94A3B8" : "#94A3B8" }}>Q 150.00 x 1</div>
                          </div>
                        </div>
                        <div style={{ color: isDark ? "#F8FAFC" : "#1E293B" }} className="font-bold">Q 150.00</div>
                      </div>
                    </div>
                    <div 
                      style={{ borderTopColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0" }}
                      className="border-t pt-3 flex justify-between items-center text-[10px]"
                    >
                      <span style={{ color: isDark ? "#94A3B8" : "#64748B" }} className="font-bold uppercase">Métodos de pago habilitados:</span>
                      <div className="flex gap-2">
                        {(props.showReservations ?? true) && <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">Reserva física</span>}
                        {(props.showCardPayments ?? true) && <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-bold">Stripe</span>}
                      </div>
                    </div>
                  </div>
                </section>
              );
            }

            if (section.type === "footer") {
              return (
                <footer
                  key={section.id}
                  onClick={() => handleSelectSection(section.id)}
                  style={{
                    backgroundColor: props.backgroundColor || "#0F172A",
                    color: props.textColor || "#94A3B8",
                    ...customStyle
                  }}
                  className={`${STORE_LAYOUT.section} cursor-pointer py-8 text-center ${previewDevice === "mobile" ? "text-[8px] py-4" : "text-[10px] py-8"} font-semibold border-t border-slate-800 transition-all select-none relative ${
                    isSelected ? "outline outline-2 outline-[#22D3A6] outline-offset-[-2px] z-30 animate-pulse" : ""
                  }`}
                >
                  <div className={STORE_LAYOUT.content}>
                  <span>{props.copyrightText || "© 2026 Reservados todos los derechos."}</span>
                  </div>
                </footer>
              );
            }
            
            return null;
          })}
        </div>
      </div>
    </div>
  );
}