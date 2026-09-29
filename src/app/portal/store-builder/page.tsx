"use client";

import { useAuthStore } from "@/stores/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { changedPageIds, serializeDesign } from "@/lib/constructor/unsaved-changes";
import { toast } from "sonner";
import {
  Loader2,
  Trash2,
  Eye,
  Monitor,
  Tablet,
  Smartphone,
  Sparkles,
  Save,
  ArrowLeft,
  Store,
  ChevronDown,
  Sliders,
  Settings,
  Undo2,
  Redo2,
  History
} from "lucide-react";
import {
  getTiendas,
  type TiendaDto,
  actualizarConfiguracionVisual,
  getIntegraciones,
  getConfiguracionHistorial,
  guardarConfiguracionDraft,
  restaurarConfiguracion,
  type ConfiguracionHistorialDto
} from "@/lib/api/admin";
import { useStoreBuilderHistory } from "@/hooks/useStoreBuilderHistory";

// Import modular constructor components
import { ConstructorLeftPanel } from "@/components/features/portal/constructor/ConstructorLeftPanel";
import { ConstructorPreview } from "@/components/features/portal/constructor/ConstructorPreview";
import { ConstructorRightPanel } from "@/components/features/portal/constructor/ConstructorRightPanel";
import { HistoryPanel } from "@/components/features/portal/constructor/HistoryPanel";

export default function ConstructorPage() {
  const usuario = useAuthStore((state) => state.usuario);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const router = useRouter();
  const historyApi = useStoreBuilderHistory<any>();
  const {
    configuracion: storeConfig,
    setConfiguracion: setStoreConfig,
    reset: resetHistory,
    undo,
    redo,
    canUndo,
    canRedo,
  } = historyApi;

  // Stores states
  const [tiendas, setTiendas] = useState<TiendaDto[]>([]);
  const [activeStore, setActiveStore] = useState<TiendaDto | null>(null);

  // Store Builder State
  const [savedDesign, setSavedDesign] = useState<string | null>(null);
  const hasUnsavedChanges = storeConfig !== null && savedDesign !== null && serializeDesign(storeConfig) !== savedDesign;
  const dirtyPageIds = changedPageIds(storeConfig?.pages ?? [], savedDesign);

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const beforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const onLinkClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const destination = new URL(link.href, window.location.href);
      if (destination.pathname === window.location.pathname && destination.search === window.location.search && destination.origin === window.location.origin) return;
      if (!window.confirm("Tienes cambios sin guardar. ¿Quieres salir y descartarlos?")) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", beforeUnload);
    document.addEventListener("click", onLinkClick, true);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
      document.removeEventListener("click", onLinkClick, true);
    };
  }, [hasUnsavedChanges]);

  const [persistedHistory, setPersistedHistory] = useState<ConfiguracionHistorialDto[]>([]);
  const [showHistoryPanel, setShowHistoryPanel] = useState(false);
  const [selectedHistoryVersion, setSelectedHistoryVersion] = useState<ConfiguracionHistorialDto | null>(null);
  const [isRestoringVersion, setIsRestoringVersion] = useState(false);
  const initializedConfig = useRef(false);
  const deviceId = useRef("");
  const [selectedSectionId, setSelectedSectionId] = useState<string>("announcement");
  const [leftTab, setLeftTab] = useState<"sections" | "theme">("sections");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "tablet" | "mobile">("desktop");
  const [isPublishingConfig, setIsPublishingConfig] = useState(false);
  
  const [activePageId, setActivePageId] = useState<string>("home");
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);
  const [isCreatePageModalOpen, setIsCreatePageModalOpen] = useState(false);
  const [newPageName, setNewPageName] = useState("");
  const [isAddSectionModalOpen, setIsAddSectionModalOpen] = useState(false);
  const [newSectionName, setNewSectionName] = useState("");
  const [newSectionType, setNewSectionType] = useState("custom");
  const [constructorSearchTerm, setConstructorSearchTerm] = useState("");

  const [cloudinaryConfig, setCloudinaryConfig] = useState<{
    cloudName: string;
    apiKey: string;
    hasCredentials: boolean;
  }>({ cloudName: "", apiKey: "", hasCredentials: false });

  const [isHydrated, setIsHydrated] = useState(false);
  const previewConfig = selectedHistoryVersion?.config ?? storeConfig;

  const navigateWithTransition = (href: string) => {
    if (hasUnsavedChanges && !window.confirm("Tienes cambios sin guardar. ¿Quieres salir y descartarlos?")) return;
    if (typeof document !== "undefined" && (document as any).startViewTransition) {
      (document as any).startViewTransition(() => {
        router.push(href);
      });
    } else {
      router.push(href);
    }
  };

  // Hydration safety check
  useEffect(() => {
    const hasAuthData = typeof window !== "undefined" && window.localStorage.getItem("dmhub-auth");
    if (!hasAuthData) {
      router.push("/login");
      return;
    }
    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, [router]);

  useEffect(() => {
    if (isAuthenticated && token) {
      setIsHydrated(true);
    }
  }, [isAuthenticated, token]);

  // Load stores
  useEffect(() => {
    if (isHydrated && token) {
      getTiendas(token)
        .then((data) => {
          setTiendas(data);
          const storedTenantId = window.localStorage.getItem("active_tenant_id");
          if (storedTenantId) {
            const found = data.find((t) => t.id === storedTenantId);
            if (found) {
              setActiveStore(found);
              return;
            }
          }
          if (data.length > 0) {
            setActiveStore(data[0]);
            window.localStorage.setItem("active_tenant_id", data[0].id);
          }
        })
        .catch((err) => {
          console.error("Error al cargar tiendas", err);
          toast.error("No se pudieron cargar las tiendas.");
        });
    }
  }, [isHydrated, token]);

  // Load integrations for Cloudinary config
  useEffect(() => {
    if (isHydrated && token && activeStore) {
      getIntegraciones(token)
        .then((data) => {
          if (data.cloudinaryCloudName && data.cloudinaryApiKey && data.cloudinaryApiSecret) {
            setCloudinaryConfig({
              cloudName: data.cloudinaryCloudName,
              apiKey: data.cloudinaryApiKey,
              hasCredentials: true
            });
          } else {
            setCloudinaryConfig({ cloudName: "", apiKey: "", hasCredentials: false });
          }
        })
        .catch((err) => {
          console.error("Error fetching integrations in constructor", err);
        });
    }
  }, [isHydrated, token, activeStore]);

  // Load visual config
  useEffect(() => {
    if (activeStore) {
      let config = null;
      if (activeStore.configuracionVisual) {
        try {
          config = typeof activeStore.configuracionVisual === "string"
            ? JSON.parse(activeStore.configuracionVisual)
            : activeStore.configuracionVisual;
        } catch (e) {
          console.error("Error parsing visual config", e);
        }
      }
      
      const defaultSections = [
        {
          id: "announcement",
          type: "announcement",
          name: "Announcement Bar",
          properties: {
            bannerText: "ENVÍO GRATIS EN PEDIDOS SUPERIORES A Q500 • USA EL CÓDIGO LOGISTIC10",
            backgroundColor: "#1AB38C",
            textColor: "#FFFFFF",
            fontWeight: "Bold",
            stickyBanner: true,
            verticalPadding: 8,
            linkAction: "Open Link",
            linkUrl: "https://store.com/promo"
          }
        },
        {
          id: "header",
          type: "header",
          name: "Header",
          properties: {
            storeName: activeStore.nombre,
            logoUrl: "",
            menuItems: ["New Arrivals", "Logistics Tools", "Business Edition"]
          }
        },
        {
          id: "hero",
          type: "hero",
          name: "Hero Section",
          properties: {
            title: "Master Your Distribution Strategy",
            subtitle: "Commercial grade inventory systems designed for the modern logistics operator. Precision meets performance.",
            primaryButtonText: "Shop Collection",
            secondaryButtonText: "View Catalog",
            backgroundColor: "#0F172A",
            backgroundImage: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&q=80&w=1200",
            textColor: "#FFFFFF"
          }
        },
        {
          id: "products",
          type: "products",
          name: "Product Grid",
          properties: {
            title: "Featured Essentials",
            columns: 3,
            productsCount: 3,
            layoutType: "grid",
            showSearch: false
          }
        },
        {
          id: "footer",
          type: "footer",
          name: "Footer",
          properties: {
            copyrightText: `© 2026 ${activeStore.nombre}. All rights reserved.`,
            backgroundColor: "#0F172A",
            textColor: "#94A3B8"
          }
        }
      ];

      if (!config || (!config.sections && !config.pages)) {
        config = {
          sections: defaultSections
        };
      }

      if (!config.pages || config.pages.length === 0) {
        config = {
          ...config,
          pages: [
            {
              id: "home",
              name: "Inicio",
              isHome: true,
              sections: config.sections || defaultSections
            }
          ],
          currentPageId: "home"
        };
      }

      if (!config.theme) {
        config = {
          ...config,
          theme: {
            backgroundColor: "#F8FAFC",
            accentColor: "#1AB38C",
            backgroundGradient: "linear-gradient(135deg, #1e3a8a 0%, #0d9488 100%)",
            useGradient: false
          }
        };
      }

      setStoreConfig(config);
      setSavedDesign(serializeDesign(config));
      resetHistory(config);
      initializedConfig.current = false;
      setActivePageId(config.currentPageId || "home");
    }
  }, [activeStore, resetHistory]);

  useEffect(() => {
    if (!token || !activeStore) return;
    void getConfiguracionHistorial(token).then((response) => setPersistedHistory(response.history))
      .catch((error) => console.error("No se pudo cargar el historial", error));
  }, [token, activeStore]);

  useEffect(() => {
    if (!storeConfig || !token || !activeStore) return;
    if (!initializedConfig.current) {
      initializedConfig.current = true;
      return;
    }
    if (!deviceId.current) {
      deviceId.current = localStorage.getItem("store-builder-device-id") || crypto.randomUUID();
      localStorage.setItem("store-builder-device-id", deviceId.current);
    }
    const timer = window.setTimeout(() => {
      void guardarConfiguracionDraft(token, storeConfig, deviceId.current)
        .then(() => getConfiguracionHistorial(token))
        .then((response) => setPersistedHistory(response.history))
        .catch((error) => console.error("No se pudo guardar el borrador", error));
    }, 5000);
    return () => window.clearTimeout(timer);
  }, [storeConfig, token, activeStore]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (event.key.toLowerCase() === "z") {
        event.preventDefault();
        event.shiftKey ? redo() : undo();
      }
      if (event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [undo, redo]);

  const handlePropertyChange = (property: string, value: any) => {
    if (!storeConfig) return;
    setStoreConfig((prev: any) => {
      const currentPage = prev.pages.find((p: any) => p.id === activePageId) || prev.pages[0];
      const section = currentPage.sections.find((s: any) => s.id === selectedSectionId);
      const isSharedSection = ["header", "footer"].includes(selectedSectionId) || section?.type === "announcement" || selectedSectionId === "announcement";

      const updatedPages = prev.pages.map((page: any) => {
        if (isSharedSection || page.id === activePageId) {
          const updatedSections = page.sections.map((sec: any) => {
            if (sec.id === selectedSectionId) {
              return {
                ...sec,
                properties: {
                  ...sec.properties,
                  [property]: value
                }
              };
            }
            return sec;
          });
          return { ...page, sections: updatedSections };
        }
        return page;
      });

      const activePage = updatedPages.find((p: any) => p.id === activePageId) || updatedPages[0];

      return {
        ...prev,
        pages: updatedPages,
        sections: activePage.sections
      };
    });
  };

  // Drag & Drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    if (["header", "footer"].includes(id)) {
      e.preventDefault();
      return;
    }
    setDraggedSectionId(id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    if (["header", "footer"].includes(id)) return;
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (!draggedSectionId || draggedSectionId === targetId || ["header", "footer"].includes(targetId)) return;

    setStoreConfig((prev: any) => {
      const currentPage = prev.pages.find((p: any) => p.id === activePageId) || prev.pages[0];
      const sections = [...currentPage.sections];
      const draggedIdx = sections.findIndex((s) => s.id === draggedSectionId);
      const targetIdx = sections.findIndex((s) => s.id === targetId);

      if (draggedIdx !== -1 && targetIdx !== -1) {
        const [moved] = sections.splice(draggedIdx, 1);
        sections.splice(targetIdx, 0, moved);
      }

      const updatedPages = prev.pages.map((page: any) => {
        if (page.id === activePageId) {
          return { ...page, sections };
        }
        return page;
      });

      return {
        ...prev,
        pages: updatedPages,
        sections
      };
    });

    setDraggedSectionId(null);
  };

  // Custom pages handlers
  const handleCreatePage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName.trim()) return;

    const pageId = newPageName
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]/g, "-")
      .replace(/-+/g, "-");

    if (!pageId) return;

    setStoreConfig((prev: any) => {
      if (prev.pages.some((p: any) => p.id === pageId)) {
        toast.error("Ya existe una página con ese nombre.");
        return prev;
      }

      const homePage = prev.pages.find((p: any) => p.id === "home") || prev.pages[0];
      const announcement = homePage.sections.find((s: any) => s.type === "announcement");
      const header = homePage.sections.find((s: any) => s.type === "header");
      const footer = homePage.sections.find((s: any) => s.type === "footer");

      const newPageSections = [];
      if (announcement) newPageSections.push(announcement);
      if (header) newPageSections.push(header);
      
      newPageSections.push({
        id: "richtext_" + Date.now(),
        type: "richtext",
        name: "Contenido de Página",
        properties: {
          title: newPageName,
          content: "Esta es una página en blanco. Haz clic aquí para editar el contenido.",
          backgroundColor: "#FFFFFF",
          textColor: "#0F172A",
          paddingVertical: 48
        }
      });

      if (footer) newPageSections.push(footer);

      const newPage = {
        id: pageId,
        name: newPageName,
        isHome: false,
        sections: newPageSections
      };

      const updatedPages = [...prev.pages, newPage];
      const menuItems = updatedPages.map((p: any) => p.name);
      
      const fullyUpdatedPages = updatedPages.map((page: any) => {
        const sectionsWithUpdatedHeader = page.sections.map((sec: any) => {
          if (sec.type === "header") {
            return {
              ...sec,
              properties: {
                ...sec.properties,
                menuItems
              }
            };
          }
          return sec;
        });
        return { ...page, sections: sectionsWithUpdatedHeader };
      });

      toast.success(`Página "${newPageName}" creada y agregada al menú.`);
      setIsCreatePageModalOpen(false);
      setNewPageName("");
      setActivePageId(pageId);

      const activePage = fullyUpdatedPages.find((p: any) => p.id === pageId);

      return {
        ...prev,
        pages: fullyUpdatedPages,
        sections: activePage.sections
      };
    });
  };

  const handleAddSection = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSectionName.trim()) return;

    const newSecId = `section-${Date.now()}`;
    const newSection: any = {
      id: newSecId,
      type: newSectionType,
      name: newSectionName.trim(),
      properties: {}
    };

    if (newSectionType === "announcement") {
      newSection.properties = {
        bannerText: "Nuevo Anuncio especial",
        backgroundColor: "#1AB38C",
        textColor: "#FFFFFF",
        fontWeight: "Bold",
        verticalPadding: 8
      };
    } else if (newSectionType === "hero") {
      newSection.properties = {
        title: "Nuevo Título Hero",
        subtitle: "Subtítulo descriptivo de tu sección...",
        primaryButtonText: "Botón",
        backgroundColor: "#0F172A",
        textColor: "#FFFFFF"
      };
    } else if (newSectionType === "products") {
      newSection.properties = {
        title: "Nuestros Productos",
        columns: 3,
        productsCount: 3,
        layoutType: "grid",
        showSearch: false
      };
    } else if (newSectionType === "richtext") {
      newSection.properties = {
        title: "Título de Texto",
        content: "Escribe contenido aquí...",
        backgroundColor: "#FFFFFF",
        textColor: "#0F172A",
        paddingVertical: 48
      };
    } else if (newSectionType === "custom") {
      newSection.properties = {
        blocks: [
          { id: `block-text-${Date.now()}-1`, type: "text", content: "Texto de la sección personalizada. Edítame en el panel de la derecha." },
          { id: `block-image-${Date.now()}-2`, type: "image", url: "" },
          { id: `block-prod-${Date.now()}-3`, type: "product_card", title: "Producto Destacado" }
        ]
      };
    } else if (newSectionType === "cart") {
      newSection.properties = {
        title: "Carrito de Compras",
        showReservations: true,
        showCardPayments: true
      };
    }

    setStoreConfig((prev: any) => {
      const currentPage = prev.pages.find((p: any) => p.id === activePageId) || prev.pages[0];
      const sections = [...currentPage.sections];
      
      const footerIdx = sections.findIndex((s) => s.id === "footer" || s.type === "footer");
      if (footerIdx !== -1) {
        sections.splice(footerIdx, 0, newSection);
      } else {
        sections.push(newSection);
      }

      const updatedPages = prev.pages.map((page: any) => {
        if (page.id === activePageId) {
          return { ...page, sections };
        }
        return page;
      });

      return {
        ...prev,
        pages: updatedPages,
        sections
      };
    });

    setSelectedSectionId(newSecId);
    setIsAddSectionModalOpen(false);
    setNewSectionName("");
    setNewSectionType("custom");
    toast.success("Sección agregada exitosamente");
  };

  const handleDeleteSection = () => {
    if (["header", "footer"].includes(selectedSectionId)) {
      toast.error("No se puede eliminar una sección compartida obligatoria (Header, Footer)");
      return;
    }

    setStoreConfig((prev: any) => {
      const currentPage = prev.pages.find((p: any) => p.id === activePageId) || prev.pages[0];
      const sections = currentPage.sections.filter((s: any) => s.id !== selectedSectionId);

      const updatedPages = prev.pages.map((page: any) => {
        if (page.id === activePageId) {
          return { ...page, sections };
        }
        return page;
      });

      return {
        ...prev,
        pages: updatedPages,
        sections
      };
    });

    const currentPage = storeConfig.pages.find((p: any) => p.id === activePageId) || storeConfig.pages[0];
    const remainingSections = currentPage.sections.filter((s: any) => s.id !== selectedSectionId);
    if (remainingSections.length > 0) {
      setSelectedSectionId(remainingSections[0].id);
    } else {
      setSelectedSectionId("");
    }

    toast.success("Sección eliminada exitosamente");
  };

  const handleMoveBlock = (sectionId: string, blockIndex: number, direction: "up" | "down") => {
    setStoreConfig((prev: any) => {
      const updatedPages = prev.pages.map((page: any) => {
        if (page.id === activePageId) {
          const updatedSections = page.sections.map((sec: any) => {
            if (sec.id === sectionId) {
              const blocks = [...(sec.properties.blocks || [])];
              const targetIdx = direction === "up" ? blockIndex - 1 : blockIndex + 1;
              if (targetIdx >= 0 && targetIdx < blocks.length) {
                const [moved] = blocks.splice(blockIndex, 1);
                blocks.splice(targetIdx, 0, moved);
              }
              return {
                ...sec,
                properties: { ...sec.properties, blocks }
              };
            }
            return sec;
          });
          return { ...page, sections: updatedSections };
        }
        return page;
      });

      const activePage = updatedPages.find((p: any) => p.id === activePageId) || updatedPages[0];

      return {
        ...prev,
        pages: updatedPages,
        sections: activePage.sections
      };
    });
  };

  const handleAddBlock = (sectionId: string, blockType: "text" | "image" | "product_card") => {
    setStoreConfig((prev: any) => {
      const updatedPages = prev.pages.map((page: any) => {
        if (page.id === activePageId) {
          const updatedSections = page.sections.map((sec: any) => {
            if (sec.id === sectionId) {
              const blocks = [...(sec.properties.blocks || [])];
              const newBlock = {
                id: `block-${blockType}-${Date.now()}`,
                type: blockType,
                content: blockType === "text" ? "Nuevo bloque de texto" : undefined,
                url: blockType === "image" ? "" : undefined,
                title: blockType === "product_card" ? "Nueva Tarjeta de Producto" : undefined
              };
              blocks.push(newBlock);
              return {
                ...sec,
                properties: { ...sec.properties, blocks }
              };
            }
            return sec;
          });
          return { ...page, sections: updatedSections };
        }
        return page;
      });

      const activePage = updatedPages.find((p: any) => p.id === activePageId) || updatedPages[0];

      return {
        ...prev,
        pages: updatedPages,
        sections: activePage.sections
      };
    });
  };

  const handleDeleteBlock = (sectionId: string, blockIndex: number) => {
    setStoreConfig((prev: any) => {
      const updatedPages = prev.pages.map((page: any) => {
        if (page.id === activePageId) {
          const updatedSections = page.sections.map((sec: any) => {
            if (sec.id === sectionId) {
              const blocks = [...(sec.properties.blocks || [])];
              blocks.splice(blockIndex, 1);
              return {
                ...sec,
                properties: { ...sec.properties, blocks }
              };
            }
            return sec;
          });
          return { ...page, sections: updatedSections };
        }
        return page;
      });

      const activePage = updatedPages.find((p: any) => p.id === activePageId) || updatedPages[0];

      return {
        ...prev,
        pages: updatedPages,
        sections: activePage.sections
      };
    });
  };

  const handleBlockFieldChange = (sectionId: string, blockIndex: number, field: string, value: any) => {
    setStoreConfig((prev: any) => {
      const updatedPages = prev.pages.map((page: any) => {
        if (page.id === activePageId) {
          const updatedSections = page.sections.map((sec: any) => {
            if (sec.id === sectionId) {
              const blocks = [...(sec.properties.blocks || [])];
              blocks[blockIndex] = {
                ...blocks[blockIndex],
                [field]: value
              };
              return {
                ...sec,
                properties: { ...sec.properties, blocks }
              };
            }
            return sec;
          });
          return { ...page, sections: updatedSections };
        }
        return page;
      });

      const activePage = updatedPages.find((p: any) => p.id === activePageId) || updatedPages[0];

      return {
        ...prev,
        pages: updatedPages,
        sections: activePage.sections
      };
    });
  };

  const handleDeletePage = (pageId: string) => {
    if (pageId === "home") {
      toast.error("No se puede eliminar la página de Inicio.");
      return;
    }

    setStoreConfig((prev: any) => {
      const updatedPages = prev.pages.filter((p: any) => p.id !== pageId);
      const menuItems = updatedPages.map((p: any) => p.name);

      const fullyUpdatedPages = updatedPages.map((page: any) => {
        const sectionsWithUpdatedHeader = page.sections.map((sec: any) => {
          if (sec.type === "header") {
            return {
              ...sec,
              properties: {
                ...sec.properties,
                menuItems
              }
            };
          }
          return sec;
        });
        return { ...page, sections: sectionsWithUpdatedHeader };
      });

      toast.success("Página eliminada.");
      setActivePageId("home");

      const activePage = fullyUpdatedPages.find((p: any) => p.id === "home");

      return {
        ...prev,
        pages: fullyUpdatedPages,
        sections: activePage.sections
      };
    });
  };

  const handlePublishConfig = async () => {
    if (!token || !activeStore || !storeConfig || isPublishingConfig) return;
    setIsPublishingConfig(true);
    try {
      const submittedDesign = serializeDesign(storeConfig);
      await actualizarConfiguracionVisual(token, storeConfig);
      // Only mark the submitted content as saved; retain edits made during the request.
      setSavedDesign(submittedDesign);
      toast.success("¡Plantilla visual publicada y guardada con éxito!");
    } catch (err) {
      console.error(err);
      toast.error("Error al publicar la plantilla.");
    } finally {
      setIsPublishingConfig(false);
    }
  };

  const handleRestoreVersion = async (version: number) => {
    if (!token || !version) return;
    setIsRestoringVersion(true);
    try {
      const updated = await restaurarConfiguracion(token, version);
      const config = JSON.parse(updated.configuracionVisual);
      resetHistory(config);
      setActiveStore(updated);
      const response = await getConfiguracionHistorial(token);
      setPersistedHistory(response.history);
      setSelectedHistoryVersion(null);
      setShowHistoryPanel(false);
      toast.success(`Versión ${version} restaurada.`);
    } catch (error) {
      console.error(error);
      toast.error("No se pudo restaurar la versión seleccionada.");
    } finally {
      setIsRestoringVersion(false);
    }
  };

  if (!isHydrated || !usuario) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#081018] text-white gap-3">
        <Loader2 className="animate-spin text-[#22D3A6]" size={32} />
        <p className="text-sm font-medium text-slate-400">Cargando Centro de Control...</p>
      </div>
    );
  }

  return (
    <div className="flex max-h-screen bg-[#081018] text-slate-100 font-sans antialiased">
      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Dashboard Panels */}
        <div className="flex-1 p-6 relative z-10 flex flex-col min-h-0 overflow-hidden">
          {/* Decorative Blur Backgrounds */}
          <div className="pointer-events-none absolute top-20 left-1/3 h-[400px] w-[400px] rounded-full bg-[#22D3A6]/2 blur-[100px] -z-10" />
          <div className="pointer-events-none absolute bottom-10 right-1/4 h-[500px] w-[500px] rounded-full bg-[#38BDF8]/2 blur-[120px] -z-10" />

          {!storeConfig ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-5">
              <div className="p-5 rounded-2xl bg-slate-955/50 border border-slate-900 shadow-2xl flex items-center justify-center animate-pulse">
                <Store size={44} className="text-[#38BDF8]" />
              </div>
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-black text-white">No hay ninguna tienda activa seleccionada</h3>
                <p className="text-xs text-slate-400 max-w-sm leading-relaxed mx-auto">
                  Por favor, selecciona una tienda utilizando el selector en la barra superior o crea una tienda para comenzar a personalizarla.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col gap-5 overflow-hidden min-h-0">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between shrink-0">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigateWithTransition("/portal")}
                    className="h-10 px-4 rounded-xl border border-slate-800 bg-slate-900/40 text-slate-400 hover:text-white text-xs font-bold flex items-center gap-2 transition-all hover:bg-slate-800/40 cursor-pointer border-none"
                    title="Volver al Portal"
                  >
                    <ArrowLeft size={14} />
                    <span>Volver</span>
                  </button>
                  <div className="h-6 w-px bg-slate-800" />
                  <div>
                    <h2 className="text-xl font-black text-white flex items-center gap-2">
                      <Sparkles className="text-[#22D3A6]" size={22} />
                      <span>Constructor de Tienda</span>
                    </h2>
                    <p className="text-xs text-slate-400">Edita y publica la plantilla visual de tu tienda en línea</p>
                  </div>
                </div>
                
                <div className="flex flex-wrap items-center gap-3 xl:flex-1 xl:justify-end">
                  {/* Active Page Selector */}
                  <div className="flex items-center gap-2 bg-slate-955/65 px-3 py-1.5 rounded-xl border border-slate-900">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Editar Página:</span>
                    <select
                      value={activePageId}
                      onChange={(e) => {
                        setActivePageId(e.target.value);
                        const targetPage = storeConfig.pages.find((p: any) => p.id === e.target.value);
                        if (targetPage && targetPage.sections.length > 0) {
                          setSelectedSectionId(targetPage.sections[0].id);
                        }
                      }}
                      className="bg-transparent text-xs font-bold text-slate-200 border-none outline-none cursor-pointer font-sans"
                    >
                      {storeConfig.pages.map((p: any) => (
                        <option key={p.id} value={p.id} className="bg-slate-955 text-slate-200 font-semibold">{p.name}{dirtyPageIds.has(p.id) ? " ● (sin guardar)" : ""}</option>
                      ))}
                    </select>
                  </div>

                  {activePageId !== "home" && (
                    <button
                      onClick={() => handleDeletePage(activePageId)}
                      className="h-9 w-9 border border-rose-500/20 hover:border-rose-500/45 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl cursor-pointer transition-all flex items-center justify-center"
                      title="Eliminar Página Actual"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}

                  {/* Toggle Left/Right Panels on Mobile/Tablet */}
                  <button
                    onClick={() => {
                      setShowLeftPanel(!showLeftPanel);
                      if (showRightPanel) setShowRightPanel(false);
                    }}
                    className={`xl:hidden h-10 px-3 rounded-xl border border-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-slate-900/40 hover:bg-slate-800/40 ${
                      showLeftPanel ? "text-[#22D3A6] border-[#22D3A6]/40" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Sliders size={14} />
                    <span className="hidden sm:inline">Estructura</span>
                  </button>

                  <button
                    onClick={() => {
                      setShowRightPanel(!showRightPanel);
                      if (showLeftPanel) setShowLeftPanel(false);
                    }}
                    className={`xl:hidden h-10 px-3 rounded-xl border border-slate-800 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer bg-slate-900/40 hover:bg-slate-800/40 ${
                      showRightPanel ? "text-[#22D3A6] border-[#22D3A6]/40" : "text-slate-400 hover:text-white"
                    }`}
                  >
                    <Settings size={14} />
                    <span className="hidden sm:inline">Propiedades</span>
                  </button>

                  <div className="h-6 w-px bg-slate-800" />
                  {/* Viewport size toggles */}
                  <div className="flex items-center gap-1 bg-slate-955/60 p-1.5 rounded-xl border border-slate-900">
                    <button
                      onClick={() => setPreviewDevice("desktop")}
                      className={`p-2 rounded-lg cursor-pointer border-none transition-all ${
                        previewDevice === "desktop" ? "bg-[#22D3A6] text-slate-955" : "text-slate-400 hover:text-white bg-transparent"
                      }`}
                      title="Vista Escritorio"
                    >
                      <Monitor size={16} />
                    </button>
                    <button
                      onClick={() => setPreviewDevice("tablet")}
                      className={`p-2 rounded-lg cursor-pointer border-none transition-all ${
                        previewDevice === "tablet" ? "bg-[#22D3A6] text-slate-955" : "text-slate-400 hover:text-white bg-transparent"
                      }`}
                      title="Vista Tableta"
                    >
                      <Tablet size={16} />
                    </button>
                    <button
                      onClick={() => setPreviewDevice("mobile")}
                      className={`p-2 rounded-lg cursor-pointer border-none transition-all ${
                        previewDevice === "mobile" ? "bg-[#22D3A6] text-slate-955" : "text-slate-400 hover:text-white bg-transparent"
                      }`}
                      title="Vista Móvil"
                    >
                      <Smartphone size={16} />
                    </button>
                  </div>

                  <div className="flex items-center gap-1 rounded-xl border border-slate-800 bg-slate-900 p-1">
                    <button onClick={undo} disabled={!canUndo} title="Deshacer (Ctrl/Cmd+Z)" className="p-2 rounded-lg text-slate-300 hover:text-white disabled:opacity-40">
                      <Undo2 size={16} />
                    </button>
                    <button onClick={redo} disabled={!canRedo} title="Rehacer (Ctrl/Cmd+Y)" className="p-2 rounded-lg text-slate-300 hover:text-white disabled:opacity-40">
                      <Redo2 size={16} />
                    </button>
                  </div>

                  <button
                    onClick={() => setShowHistoryPanel(true)}
                    className="flex h-10 items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 px-4 text-xs font-bold text-slate-200 transition hover:border-slate-600 hover:text-white"
                  >
                    <History size={15} className="text-[#38BDF8]" />
                    Historial
                  </button>

                  <a
                    href={activeStore?.slug ? `https://${activeStore.slug}.${process.env.NEXT_PUBLIC_MAIN_DOMAIN || "dmhub.fun"}` : `/preview/${activeStore?.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="h-10 px-4 rounded-xl bg-slate-900 hover:bg-slate-855 border border-slate-800 text-slate-350 hover:text-white text-xs font-bold transition-all flex items-center gap-2 cursor-pointer no-underline"
                    title="Ver Tienda Completa en Vivo (Subdominio)"
                  >
                    <Eye size={14} className="text-[#38BDF8]" />
                    <span>Ver Tienda (Live)</span>
                  </a>

                  <div className="ml-auto flex shrink-0 items-center gap-3">
                    <span role="status" className={`flex items-center gap-2 whitespace-nowrap text-xs font-semibold ${hasUnsavedChanges ? "text-amber-400" : "text-slate-400"}`}>
                      {hasUnsavedChanges && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-amber-400" />}
                      {hasUnsavedChanges ? "Cambios sin guardar" : "Sin cambios pendientes"}
                    </span>
                    <button
                      onClick={handlePublishConfig}
                      disabled={isPublishingConfig}
                      className="flex h-10 shrink-0 items-center gap-2 whitespace-nowrap rounded-xl bg-gradient-to-r from-[#22D3A6] to-[#38BDF8] px-5 text-xs font-black text-slate-955 shadow-[0_4px_15px_rgba(34,211,166,0.2)] transition-all hover:brightness-110 disabled:opacity-50"
                    >
                      {isPublishingConfig ? (
                        <>
                          <Loader2 className="animate-spin" size={15} />
                          <span>Publicando...</span>
                        </>
                      ) : (
                        <>
                          <Save size={15} />
                          <span>Guardar y Publicar</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Main constructor workspace layout */}
              <div className="flex flex-1 gap-6 overflow-hidden min-h-0">
                {/* 1. LEFT PANEL */}
                <ConstructorLeftPanel
                  dirtyPageIds={dirtyPageIds}
                  storeConfig={storeConfig}
                  setStoreConfig={setStoreConfig}
                  activePageId={activePageId}
                  setActivePageId={setActivePageId}
                  selectedSectionId={selectedSectionId}
                  setSelectedSectionId={setSelectedSectionId}
                  leftTab={leftTab}
                  setLeftTab={setLeftTab}
                  showLeftPanel={showLeftPanel}
                  setShowLeftPanel={setShowLeftPanel}
                  isCreatePageModalOpen={isCreatePageModalOpen}
                  setIsCreatePageModalOpen={setIsCreatePageModalOpen}
                  isAddSectionModalOpen={isAddSectionModalOpen}
                  setIsAddSectionModalOpen={setIsAddSectionModalOpen}
                  draggedSectionId={draggedSectionId}
                  newPageName={newPageName}
                  setNewPageName={setNewPageName}
                  newSectionName={newSectionName}
                  setNewSectionName={setNewSectionName}
                  newSectionType={newSectionType}
                  setNewSectionType={setNewSectionType}
                  activeStore={activeStore}
                  handleCreatePage={handleCreatePage}
                  handleAddSection={handleAddSection}
                  handleDeletePage={handleDeletePage}
                  handleDragStart={handleDragStart}
                  handleDragOver={handleDragOver}
                  handleDrop={handleDrop}
                />

                {/* 2. CENTER PANEL (SIMULATOR VIEW) */}
                <ConstructorPreview
                  storeConfig={previewConfig}
                  activePageId={activePageId}
                  setActivePageId={setActivePageId}
                  selectedSectionId={selectedSectionId}
                  setSelectedSectionId={setSelectedSectionId}
                  previewDevice={previewDevice}
                  activeStore={activeStore}
                  constructorSearchTerm={constructorSearchTerm}
                  setConstructorSearchTerm={setConstructorSearchTerm}
                />

                {/* 3. RIGHT PANEL */}
                <ConstructorRightPanel
                  storeConfig={storeConfig}
                  setStoreConfig={setStoreConfig}
                  activePageId={activePageId}
                  selectedSectionId={selectedSectionId}
                  setSelectedSectionId={setSelectedSectionId}
                  showRightPanel={showRightPanel}
                  setShowRightPanel={setShowRightPanel}
                  token={token}
                  cloudinaryConfig={cloudinaryConfig}
                  handlePropertyChange={handlePropertyChange}
                  handleDeleteSection={handleDeleteSection}
                  handleMoveBlock={handleMoveBlock}
                  handleAddBlock={handleAddBlock}
                  handleDeleteBlock={handleDeleteBlock}
                  handleBlockFieldChange={handleBlockFieldChange}
                />
              </div>
            </div>
          )}
        </div>
      </main>
      {showHistoryPanel ? (
        <HistoryPanel
          entries={persistedHistory}
          selectedVersion={selectedHistoryVersion?.version ?? null}
          onPreview={setSelectedHistoryVersion}
          onRestore={(version) => void handleRestoreVersion(version)}
          onClose={() => {
            setShowHistoryPanel(false);
            setSelectedHistoryVersion(null);
          }}
          restoring={isRestoringVersion}
        />
      ) : null}
    </div>
  );
}