"use client";

import type { StoreVisualConfig } from "@/types/store-builder";

import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  GitBranch,
  Settings,
  Calendar,
  CreditCard,
  Users,
  Package,
  BarChart3,
  User,
  Store,
  Plus,
  Search,
  LogOut,
  ChevronDown,
  Eye,
  X,
  Loader2,
  Mail,
  Sparkles,
  Menu,
  Kanban,
  BookOpen,
} from "lucide-react";
import {
  getTiendas,
  crearTienda,
  type TiendaDto,
  getSucursales,
  type SucursalDto,
  getPlatformUsuarios,
  type PlatformUsuarioDto,
  getPlatformProductos,
  type PlatformProductoDto,
  getPlatformReservaciones,
  type ReservacionDto,
  cambiarEstadoPlatformUsuario,
  cambiarRolPlatformUsuario,
  actualizarConfiguracionVisual,
  getIntegraciones
} from "@/lib/api/admin";
import { obtenerCategorias } from "@/lib/api/productos";
import type { TCategoria } from "@/types";

// Import modular tab components
import { DashboardTab } from "@/components/features/portal/DashboardTab";
import { SucursalesTab } from "@/components/features/portal/SucursalesTab";
import { ClientesTab } from "@/components/features/portal/ClientesTab";
import { UsuariosTab } from "@/components/features/portal/UsuariosTab";
import { ProductosTab } from "@/components/features/portal/ProductosTab";
import { ReservacionesTab } from "@/components/features/portal/ReservacionesTab";
import { PagosTab } from "@/components/features/portal/PagosTab";
import { ReportesTab } from "@/components/features/portal/ReportesTab";
import { SettingsTab } from "@/components/features/portal/SettingsTab";
import { KanbanTab } from "@/components/features/portal/KanbanTab";
import { PortalModal } from "@/components/ui/PortalModal";
import { useTheme, useLanguage } from "@/contexts/ThemeLanguageContext";
import { useTranslations } from "next-intl";
import { Globe } from "lucide-react";

const getDocsUrl = () => {
  return "https://docs.dmhub.fun";
};

export default function PortalPage() {
  return <Suspense fallback={null}><PortalContent /></Suspense>;
}

function PortalContent() {
  const usuario = useAuthStore((state) => state.usuario);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const token = useAuthStore((state) => state.token);
  const logout = useAuthStore((state) => state.logout);
  const router = useRouter();

  // Theme and Language from global context
  const { theme, toggleTheme, isDark } = useTheme();
  const { language, toggleLanguage } = useLanguage();
  const t = useTranslations("Portal");
  const tCommon = useTranslations("Common");

  // Active Tab
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") || "tablero";
  const validTab = ["tablero", "sucursales", "clientes", "usuarios", "productos", "reservaciones", "pagos", "reportes", "settings", "kanban"].includes(requestedTab);
  const activeTab = validTab ? requestedTab : "tablero";
  const [menuAbierto, setMenuAbierto] = useState(false);

  const tabTitles: Record<string, string> = {
    tablero: t("tablero"),
    sucursales: t("sucursales"),
    clientes: t("clientes"),
    usuarios: t("usuarios"),
    productos: t("productos"),
    reservaciones: t("reservaciones"),
    pagos: t("pagos"),
    reportes: t("reportes"),
    settings: t("configuracion"),
    kanban: t("kanban"),
  };

  // Shared platform master data
  const [tiendas, setTiendas] = useState<TiendaDto[]>([]);
  const [activeStore, setActiveStore] = useState<TiendaDto | null>(null);
  const [isStoreDropdownOpen, setIsStoreDropdownOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newStoreName, setNewStoreName] = useState("");
  const [newStoreSlug, setNewStoreSlug] = useState("");
  const [isCreatingStore, setIsCreatingStore] = useState(false);

  // Shared store details
  const [hasCloudinary, setHasCloudinary] = useState(false);

  // Master lists passed to components
  const [sucursales, setSucursales] = useState<SucursalDto[]>([]);
  const [loadingSucursales, setLoadingSucursales] = useState(false);

  const [usuarios, setUsuarios] = useState<PlatformUsuarioDto[]>([]);
  const [loadingUsuarios, setLoadingUsuarios] = useState(false);

  const [productos, setProductos] = useState<PlatformProductoDto[]>([]);
  const [loadingProductos, setLoadingProductos] = useState(false);
  const [categorias, setCategorias] = useState<TCategoria[]>([]);

  const [reservaciones, setReservaciones] = useState<ReservacionDto[]>([]);
  const [loadingReservaciones, setLoadingReservaciones] = useState(false);

  // Modals inside ClientesTab/portal page (e.g. Change Role)
  const [isChangeRolModalOpen, setIsChangeRolModalOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState<PlatformUsuarioDto | null>(null);
  const [changeRolForm, setChangeRolForm] = useState({
    tipoUsuario: "cliente",
    rolStaff: "cajero",
    sucursalId: ""
  });

  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Search states
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const esSuperAdmin = usuario?.esSuperAdmin || usuario?.rol === "superadmin";
  const esAdmin = esSuperAdmin || usuario?.rol === "admin";
  const esStaff = esAdmin || usuario?.rol === "cajero";

  // Route protection
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, router]);

  // Derive the design from the currently selected store.
  const storeConfig = useMemo<StoreVisualConfig | null>(() => {
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
      if (!config || !config.sections) {
        config = {
          sections: [
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
                productsCount: 3
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
          ]
        };
      }
      return config;
    }
    return null;
  }, [activeStore]);

  useEffect(() => {
    if (!validTab) {
      toast.error("Pestaña no válida en la URL, redirigiendo al tablero");
      router.replace("/portal?tab=tablero");
    }
  }, [validTab, router]);

  // Update dynamic document title
  useEffect(() => {
    const storeName = activeStore?.nombre ? ` – ${activeStore.nombre}` : "";
    document.title = `${tabTitles[activeTab] ?? activeTab}${storeName} | Portal Admin`;
  }, [activeTab, activeStore, language, tabTitles]);

  // Load stores list
  useEffect(() => {
    if (token) {
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
  }, [token]);

  // Check integrations for Cloudinary
  useEffect(() => {
    if (token) {
      getIntegraciones(token)
        .then((res) => {
          setHasCloudinary(!!(res.cloudinaryCloudName && res.cloudinaryApiKey && res.cloudinaryApiSecret));
        })
        .catch((err) => console.error("Error al verificar Cloudinary", err));
    }
  }, [token]);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsStoreDropdownOpen(false);
      }
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsSearchFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Individual reloaders passed down to tabs
  const refreshSucursales = () => {
    if (!token) return;
    setLoadingSucursales(true);
    getSucursales(token)
      .then(setSucursales)
      .catch(() => toast.error("Error al cargar sucursales"))
      .finally(() => setLoadingSucursales(false));
  };

  const refreshUsuarios = () => {
    if (!token || !esAdmin) return;
    setLoadingUsuarios(true);
    Promise.all([
      getPlatformUsuarios(token).catch(() => [] as PlatformUsuarioDto[]),
      getSucursales(token).catch(() => [] as SucursalDto[])
    ]).then(([usrList, sucList]) => {
      setUsuarios(usrList);
      setSucursales(sucList);
    })
      .catch(() => toast.error("Error al cargar colaboradores y sucursales"))
      .finally(() => setLoadingUsuarios(false));
  };

  const refreshProductos = () => {
    if (!token) return;
    setLoadingProductos(true);
    Promise.all([
      getPlatformProductos(token).catch(() => [] as PlatformProductoDto[]),
      obtenerCategorias(token).catch(() => [] as TCategoria[])
    ])
      .then(([prods, cats]) => {
        setProductos(prods);
        setCategorias(cats);
      })
      .catch(() => {
        toast.error("Error al cargar productos");
      })
      .finally(() => {
        setLoadingProductos(false);
      });
  };

  const refreshReservaciones = () => {
    if (!token || !esStaff) return;
    setLoadingReservaciones(true);
    getPlatformReservaciones(token)
      .then(setReservaciones)
      .catch(() => toast.error("Error al cargar reservaciones"))
      .finally(() => setLoadingReservaciones(false));
  };

  // Tab changer helper updating search param
  const handleTabChange = (tab: string) => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      url.searchParams.set("tab", tab);
      window.history.replaceState(null, "", url.pathname + url.search);
    }
  };

  // Restricción de acceso para la pestaña Kanban
  useEffect(() => {
    if (usuario && activeTab === "kanban" && !esStaff) {
      toast.error("No tienes permisos para acceder a esta sección.");
      handleTabChange("tablero");
    }
  }, [usuario, activeTab, esStaff]);

  // Main reload effect for tabs
  useEffect(() => {
    if (!token || !activeStore) return;

    if (activeTab === "tablero") {
      Promise.all([
        getSucursales(token).catch(() => [] as SucursalDto[]),
        (esAdmin ? getPlatformUsuarios(token) : Promise.resolve([] as PlatformUsuarioDto[])).catch(() => [] as PlatformUsuarioDto[]),
        getPlatformProductos(token).catch(() => [] as PlatformProductoDto[]),
        (esStaff ? getPlatformReservaciones(token) : Promise.resolve([] as ReservacionDto[])).catch(() => [] as ReservacionDto[])
      ] as const).then(([sucList, usrList, prodList, resList]) => {
        setSucursales(sucList as SucursalDto[]);
        setUsuarios(usrList as PlatformUsuarioDto[]);
        setProductos(prodList as PlatformProductoDto[]);
        setReservaciones(resList as ReservacionDto[]);
      });
    } else if (activeTab === "sucursales") {
      refreshSucursales();
    } else if (activeTab === "clientes" || activeTab === "usuarios") {
      refreshUsuarios();
    } else if (activeTab === "productos") {
      refreshProductos();
    } else if (activeTab === "reservaciones" || activeTab === "pagos") {
      refreshReservaciones();
    }
  }, [token, activeStore, activeTab]);

  const navigateWithTransition = (href: string) => {
    if (typeof document !== "undefined" && document.startViewTransition) {
      document.startViewTransition(() => {
        router.push(href);
      });
    } else {
      router.push(href);
    }
  };

  // Select Store / Tenant Selector
  const handleSelectStore = (store: TiendaDto) => {
    setActiveStore(store);
    window.localStorage.setItem("active_tenant_id", store.id);
    setIsStoreDropdownOpen(false);
    toast.success(`Tienda cambiada a: ${store.nombre}`);
    router.refresh();
  };

  // Create new tenant instance
  const handleCreateStore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStoreName || !newStoreSlug) {
      toast.error("Por favor completa los campos");
      return;
    }
    if (!token) return;

    setIsCreatingStore(true);
    try {
      const created = await crearTienda(token, {
        nombre: newStoreName,
        slug: newStoreSlug
      });
      setTiendas((prev) => [...prev, created]);
      setActiveStore(created);
      window.localStorage.setItem("active_tenant_id", created.id);
      setIsCreateModalOpen(false);
      setNewStoreName("");
      setNewStoreSlug("");
      toast.success(`¡Tienda "${created.nombre}" creada y seleccionada!`);
      router.refresh();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo crear la tienda";
      toast.error(msg);
    } finally {
      setIsCreatingStore(false);
    }
  };

  // Dynamic Search Engine
  const getSearchResults = () => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    const results: { categoria: string; nombre: string; onClick: () => void }[] = [];

    // Search branches
    sucursales.filter(s => s.nombre.toLowerCase().includes(q) || (s.direccion && s.direccion.toLowerCase().includes(q))).forEach(s => {
      results.push({
        categoria: "Sucursales",
        nombre: `${s.nombre} (${s.direccion ?? "Sin dirección"})`,
        onClick: () => {
          handleTabChange("sucursales");
          setSearchQuery("");
        }
      });
    });

    // Search users
    usuarios.filter(u => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)).forEach(u => {
      results.push({
        categoria: "Clientes y Colaboradores",
        nombre: `${u.name} - ${u.email} (${u.tipoUsuario === "staff" ? u.rolStaff : "Cliente"})`,
        onClick: () => {
          handleTabChange("clientes");
          setSearchQuery("");
        }
      });
    });

    // Search products
    productos.filter(p => p.nombre.toLowerCase().includes(q) || (p.sku && p.sku.toLowerCase().includes(q))).forEach(p => {
      results.push({
        categoria: "Productos",
        nombre: `${p.nombre} [SKU: ${p.sku ?? "N/A"}]`,
        onClick: () => {
          handleTabChange("productos");
          setSearchQuery("");
        }
      });
    });

    return results;
  };

  const searchResults = getSearchResults();

  const groupedSearchResults = searchResults.reduce((acc, current) => {
    if (!acc[current.categoria]) {
      acc[current.categoria] = [];
    }
    acc[current.categoria].push(current);
    return acc;
  }, {} as Record<string, typeof searchResults>);

  const formatRole = (role: string | null | undefined) => {
    if (usuario?.esSuperAdmin) {
      return "Super Administrador";
    }
    if (role === "administrador" || role === "admin") return "Administrador";
    if (role === "cajero") return "Cajero";
    return role || "Personal";
  };

  // Clientes CRM role modal handlers
  const handleOpenChangeRolModal = (u: PlatformUsuarioDto) => {
    setSelectedUsuario(u);
    setChangeRolForm({
      tipoUsuario: u.tipoUsuario,
      rolStaff: u.rolStaff || "cajero",
      sucursalId: u.sucursalId || ""
    });
    setIsChangeRolModalOpen(true);
  };

  const handleChangeRolUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !selectedUsuario) return;

    try {
      const payload = {
        tipoUsuario: changeRolForm.tipoUsuario,
        rolStaff: changeRolForm.tipoUsuario === "staff" ? changeRolForm.rolStaff : undefined,
        sucursalId: changeRolForm.tipoUsuario === "staff" && changeRolForm.sucursalId ? changeRolForm.sucursalId : null
      };
      const updated = await cambiarRolPlatformUsuario(token, selectedUsuario.id, payload);
      setUsuarios((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setIsChangeRolModalOpen(false);
      toast.success("Rol actualizado exitosamente");
    } catch (err) {
      toast.error("Error al actualizar el rol");
    }
  };

  const handleToggleEstadoUsuario = async (u: PlatformUsuarioDto) => {
    if (!token) return;

    try {
      const updated = await cambiarEstadoPlatformUsuario(token, u.id, !u.estado);
      setUsuarios((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
      toast.success(`Usuario ${updated.estado ? "activado" : "desactivado"} exitosamente`);
    } catch (err) {
      toast.error("Error al actualizar el estado del usuario");
    }
  };

  const renderSidebar = (isMobile: boolean) => {
    const handleLinkClick = (tab: string) => {
      handleTabChange(tab);
      if (isMobile) setMenuAbierto(false);
    };

    const navItemClass = (tab: string) => {
      const isActive = activeTab === tab;
      if (isActive) {
        return "bg-[#22D3A6] text-slate-955 shadow-[0_4px_12px_rgba(34,211,166,0.15)]";
      }
      return isDark
        ? "text-slate-400 hover:bg-slate-900/40 hover:text-white bg-transparent"
        : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 bg-transparent";
    };

    return (
      <>
        <div className="flex flex-col gap-8">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="DM Hub Logo" className="h-8 w-auto object-contain" />
            <div>
              <h1 className={`text-lg font-black tracking-tight leading-none ${isDark ? "text-white" : "text-slate-900"}`}>
                DM Hub
              </h1>
            </div>
            {isMobile && (
              <button
                onClick={() => setMenuAbierto(false)}
                className={`ml-auto bg-transparent border-none cursor-pointer p-1 ${isDark ? "text-slate-400 hover:text-white" : "text-slate-500 hover:text-slate-900"
                  }`}
                aria-label="Cerrar menú lateral"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Nav Links */}
          <nav className="flex flex-col gap-1">
            <button
              onClick={() => handleLinkClick("tablero")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                "tablero"
              )}`}
            >
              <LayoutDashboard size={18} />
              <span>{t("tablero")}</span>
            </button>
            <button
              onClick={() => handleLinkClick("sucursales")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                "sucursales"
              )}`}
            >
              <GitBranch size={18} />
              <span>{t("sucursales")}</span>
            </button>
            <button
              onClick={() => handleLinkClick("reservaciones")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                "reservaciones"
              )}`}
            >
              <Calendar size={18} />
              <span>{t("reservaciones")}</span>
            </button>
            <button
              onClick={() => handleLinkClick("pagos")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                "pagos"
              )}`}
            >
              <CreditCard size={18} />
              <span>{t("pagos")}</span>
            </button>
            {esStaff && (
              <button
                onClick={() => handleLinkClick("kanban")}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                  "kanban"
                )}`}
              >
                <Kanban size={18} />
                <span>{t("kanban")}</span>
              </button>
            )}
            <button
              onClick={() => handleLinkClick("clientes")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                "clientes"
              )}`}
            >
              <Users size={18} />
              <span>{t("clientes")}</span>
            </button>
            <button
              onClick={() => handleLinkClick("productos")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                "productos"
              )}`}
            >
              <Package size={18} />
              <span>{t("productos")}</span>
            </button>
            <button
              onClick={() => handleLinkClick("reportes")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                "reportes"
              )}`}
            >
              <BarChart3 size={18} />
              <span>{t("reportes")}</span>
            </button>
            <button
              onClick={() => handleLinkClick("usuarios")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                "usuarios"
              )}`}
            >
              <User size={18} />
              <span>{t("usuarios")}</span>
            </button>
            <button
              onClick={() => window.open(getDocsUrl(), "_blank", "noopener,noreferrer")}
              className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                "manual"
              )}`}
            >
              <BookOpen size={18} />
              <span>{t("docs")}</span>
            </button>
            {esAdmin && (
              <>
                <button
                  onClick={() => {
                    navigateWithTransition("/portal/constructor");
                    if (isMobile) setMenuAbierto(false);
                  }}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                    "constructor"
                  )}`}
                >
                  <Sparkles size={18} />
                  <span>{t("constructor")}</span>
                </button>
                <button
                  onClick={() => handleLinkClick("settings")}
                  className={`flex items-center gap-3 px-4 py-3 text-sm font-semibold rounded-xl transition-all text-left cursor-pointer border-none w-full ${navItemClass(
                    "settings"
                  )}`}
                >
                  <Settings size={18} />
                  <span>{t("configuracion")}</span>
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className={`pt-6 border-t ${isDark ? "border-slate-900/80" : "border-slate-200"}`}>
          <button
            onClick={() => {
              logout();
              router.push("/login");
              toast.success(language === "es" ? "Sesión cerrada correctamente" : "Logged out successfully");
            }}
            className="flex items-center gap-3 px-4 py-3 text-sm font-bold text-slate-500 hover:text-rose-500 rounded-xl transition-all text-left cursor-pointer border-none bg-transparent w-full"
          >
            <LogOut size={18} />
            <span>{t("logout")}</span>
          </button>
        </div>
      </>
    );
  };

  if (!usuario) {
    return null;
  }

  return (
    <div className={`flex min-h-screen font-sans antialiased transition-colors duration-200 ${isDark ? "bg-[#081018] text-slate-100" : "bg-slate-100 text-slate-900 portal-bg-base"
      }`}>
      {/* Desktop Sidebar */}
      <aside className={`w-64 border-r p-6 flex-col justify-between shrink-0 hidden lg:flex h-[100dvh] max-h-[100dvh] fixed top-0 left-0 z-20 overflow-y-auto sidebar-scrollbar transition-colors duration-200 ${isDark ? "border-slate-900 bg-slate-955/40" : "border-slate-200 bg-white/95 shadow-sm portal-sidebar-base"
        }`}>
        {renderSidebar(false)}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {menuAbierto && (
        <div
          className="fixed inset-0 z-40 bg-slate-950/80 backdrop-blur-sm lg:hidden"
          onClick={() => setMenuAbierto(false)}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-64 flex-col justify-between border-r p-6 transition-transform duration-200 lg:hidden h-[100dvh] max-h-[100dvh] overflow-y-auto sidebar-scrollbar",
          isDark ? "border-slate-900 bg-slate-955" : "border-slate-200 bg-white shadow-2xl portal-sidebar-base",
          menuAbierto ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {renderSidebar(true)}
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 lg:ml-64">
        {/* Top Navbar */}
        <header className={`h-16 border-b px-4 sm:px-8 flex items-center justify-between shrink-0 gap-4 relative z-45 transition-colors duration-200 ${isDark ? "border-slate-900 bg-slate-950/20" : "border-slate-200 bg-white/95 shadow-xs portal-header-base"
          }`}>
          {/* Hamburger Menu Toggle on Mobile/Tablet */}
          <button
            onClick={() => setMenuAbierto(true)}
            className={`lg:hidden p-2 rounded-xl border-none bg-transparent cursor-pointer flex items-center justify-center ${isDark ? "text-slate-400 hover:text-white hover:bg-slate-900/60" : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            aria-label="Abrir menú lateral"
          >
            <Menu size={20} />
          </button>

          {/* Live Search */}
          <div ref={searchContainerRef} className="relative z-[60] hidden w-full max-w-md md:block">
            <div className="relative">
              <Search className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? "text-slate-500" : "text-slate-400"}`} size={16} />
              <input
                type="text"
                placeholder={t("search_placeholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => setIsSearchFocused(true)}
                className={`h-10 w-full pl-10 pr-4 rounded-xl text-sm outline-none transition-all ${isDark
                    ? "border border-slate-800 bg-slate-900/40 text-slate-100 placeholder:text-slate-500 focus:border-[#22D3A6]/50 focus:ring-1 focus:ring-[#22D3A6]/20"
                    : "border border-slate-300 bg-slate-100 text-slate-900 placeholder:text-slate-400 focus:border-[#22D3A6] focus:bg-white focus:ring-1 focus:ring-[#22D3A6]/20 portal-input-base"
                  }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-none p-0 ${isDark ? "text-slate-500 hover:text-white" : "text-slate-400 hover:text-slate-900"
                    }`}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Live Search Popup */}
            {isSearchFocused && searchQuery && (
              <div className={`absolute left-0 top-12 z-[70] max-h-[360px] w-full isolate overflow-y-auto rounded-xl border p-4 shadow-2xl animate-fade-in ${isDark
                  ? "border border-slate-800 bg-[#081018] shadow-black ring-1 ring-black/60 text-slate-100"
                  : "border border-slate-200 bg-white shadow-slate-300/50 ring-1 ring-black/5 text-slate-900 portal-card-base"
                }`}>
                {searchResults.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-4">{tCommon("no_results")} &quot;{searchQuery}&quot;</p>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(groupedSearchResults).map(([cat, items]) => (
                      <div key={cat} className="space-y-1">
                        <h4 className="text-[10px] font-bold text-[#38BDF8] uppercase tracking-wider px-2">{cat}</h4>
                        <div className="flex flex-col">
                          {items.map((item, idx) => (
                            <button
                              key={idx}
                              onClick={() => {
                                item.onClick();
                                setIsSearchFocused(false);
                              }}
                              className={`text-xs text-left px-2 py-2 rounded-lg transition-all border-none bg-transparent cursor-pointer block w-full text-ellipsis overflow-hidden whitespace-nowrap ${isDark ? "text-slate-300 hover:bg-slate-900/60 hover:text-white" : "text-slate-700 hover:bg-slate-100 hover:text-slate-900"
                                }`}
                            >
                              {item.nombre}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Dropdown Stores, Profile */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Language Selector */}
            <button
              type="button"
              onClick={toggleLanguage}
              className={`flex items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-bold uppercase tracking-wide transition-all cursor-pointer ${isDark
                  ? "border-slate-800 bg-slate-900/40 text-slate-300 hover:border-slate-700 hover:text-white"
                  : "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                }`}
              aria-label={t("toggle_lang")}
              title={language === "es" ? "Switch to English" : "Cambiar a Español"}
            >
              <Globe size={14} className="text-[#38BDF8]" />
              <span>{language === "es" ? "ES" : "EN"}</span>
            </button>

            {/* Store Selector */}
            <div ref={dropdownRef} className="relative">
              <button
                onClick={() => setIsStoreDropdownOpen(!isStoreDropdownOpen)}
                className={`h-10 px-4 rounded-xl border text-xs font-semibold flex items-center gap-2.5 cursor-pointer transition-all ${isDark
                    ? "border-slate-800 bg-slate-900/40 text-slate-200 hover:border-slate-700 hover:text-white"
                    : "border-slate-200 bg-slate-100 text-slate-800 hover:border-slate-300 hover:bg-slate-200"
                  }`}
              >
                <Store size={14} className="text-[#38BDF8]" />
                <span className="max-w-[150px] truncate">{activeStore?.nombre ?? t("select_store")}</span>
                <ChevronDown size={14} className={isDark ? "text-slate-500" : "text-slate-400"} />
              </button>

              {isStoreDropdownOpen && (
                <div className={`absolute right-0 top-12 w-64 rounded-xl border p-2 shadow-2xl z-50 ${isDark
                    ? "border-slate-800 bg-slate-955 shadow-black text-slate-100"
                    : "border-slate-200 bg-white shadow-slate-300/50 text-slate-900 portal-card-base"
                  }`}>
                  <div className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 border-b ${isDark ? "text-slate-500 border-slate-900" : "text-slate-400 border-slate-100"
                    }`}>
                    {t("switch_instance")}
                  </div>
                  <div className="max-h-48 overflow-y-auto py-1 flex flex-col gap-0.5">
                    {tiendas.map((t) => (
                      <div key={t.id} className={`flex items-center justify-between px-1 rounded-lg group transition-all ${isDark ? "hover:bg-slate-900/40" : "hover:bg-slate-100"
                        }`}>
                        <button
                          onClick={() => handleSelectStore(t)}
                          className={`flex-1 flex items-center justify-between px-3 py-2 text-xs font-semibold rounded-lg transition-all text-left border-none cursor-pointer bg-transparent ${activeStore?.id === t.id
                              ? "text-[#22D3A6]"
                              : isDark
                                ? "text-slate-400 hover:text-white"
                                : "text-slate-600 hover:text-slate-900"
                            }`}
                        >
                          <span className="truncate">{t.nombre}</span>
                          {activeStore?.id === t.id && <span className="h-1.5 w-1.5 rounded-full bg-[#22D3A6] shrink-0 ml-2" />}
                        </button>
                        <a
                          href={t.slug ? `https://${t.slug}.${process.env.NEXT_PUBLIC_MAIN_DOMAIN || "dmhub.fun"}` : `/preview/${t.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`p-1.5 rounded-lg transition-all cursor-pointer mr-1 flex items-center justify-center ${isDark ? "text-slate-500 hover:text-[#38BDF8] hover:bg-slate-900" : "text-slate-400 hover:text-[#38BDF8] hover:bg-slate-100"
                            }`}
                          title={`Ver Tienda Live de ${t.nombre}`}
                        >
                          <Eye size={12} />
                        </a>
                      </div>
                    ))}
                  </div>
                  <div className={`border-t mt-1 pt-1 ${isDark ? "border-slate-900" : "border-slate-100"}`}>
                    <button
                      onClick={() => {
                        setIsStoreDropdownOpen(false);
                        setIsCreateModalOpen(true);
                      }}
                      className={`flex items-center gap-2 px-3 py-2 text-xs font-bold text-[#38BDF8] hover:text-[#22D3A6] rounded-lg transition-all text-left border-none cursor-pointer bg-transparent w-full ${isDark ? "hover:bg-slate-900/40" : "hover:bg-slate-100"
                        }`}
                    >
                      <Plus size={14} />
                      <span>{tCommon("create")} {language === "es" ? "nueva tienda" : "new store"}</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Config Button */}
            {esAdmin && (
              <button
                onClick={() => handleTabChange("settings")}
                className={`h-10 w-10 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${activeTab === "settings"
                    ? "border-[#22D3A6] bg-[#22D3A6]/10 text-[#22D3A6]"
                    : isDark
                      ? "border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-white"
                      : "border-slate-200 bg-slate-100 text-slate-600 hover:border-slate-300 hover:text-slate-900"
                  }`}
                title={t("configuracion")}
              >
                <Settings size={16} />
              </button>
            )}

            {/* Profile Avatar */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className={`text-xs font-bold leading-none ${isDark ? "text-white" : "text-slate-900"}`}>
                  {usuario.nombre}
                </p>
                <p className={`text-[9px] font-semibold mt-0.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
                  {formatRole(usuario.rol)}
                </p>
              </div>
              <div className={`h-9 w-9 rounded-xl border flex items-center justify-center overflow-hidden shrink-0 ${isDark ? "border-slate-800 bg-slate-900" : "border-slate-200 bg-slate-100"
                }`}>
                <span className="text-xs font-black text-[#38BDF8]">
                  {usuario.nombre.substring(0, 2).toUpperCase()}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Tab panels rendering container */}
        <div className="flex-1 p-8 overflow-y-auto space-y-6 relative z-10">
          <div className="pointer-events-none absolute top-20 left-1/3 h-[400px] w-[400px] rounded-full bg-[#22D3A6]/2 blur-[100px] -z-10" />
          <div className="pointer-events-none absolute bottom-10 right-1/4 h-[500px] w-[500px] rounded-full bg-[#38BDF8]/2 blur-[120px] -z-10" />

          {/* TAB: TABLERO (DASHBOARD) */}
          {activeTab === "tablero" && (
            <DashboardTab
              productos={productos}
              usuarios={usuarios}
              reservaciones={reservaciones}
              usuario={usuario}
              esAdmin={esAdmin}
              esStaff={esStaff}
            />
          )}

          {/* TAB: SUCURSALES */}
          {activeTab === "sucursales" && (
            <SucursalesTab
              token={token ?? ""}
              sucursales={sucursales}
              loadingSucursales={loadingSucursales}
              productos={productos}
              usuarios={usuarios}
              esAdmin={esAdmin}
              onRefresh={refreshSucursales}
            />
          )}

          {/* TAB: CLIENTES */}
          {activeTab === "clientes" && (
            <ClientesTab
              usuarios={usuarios}
              loadingUsuarios={loadingUsuarios}
              esAdmin={esAdmin}
              onToggleEstado={handleToggleEstadoUsuario}
              onOpenChangeRol={handleOpenChangeRolModal}
            />
          )}

          {/* TAB: USUARIOS */}
          {activeTab === "usuarios" && (
            <UsuariosTab
              token={token ?? ""}
              usuarios={usuarios}
              loadingUsuarios={loadingUsuarios}
              sucursales={sucursales}
              usuario={usuario}
              esAdmin={esAdmin}
              onRefresh={refreshUsuarios}
            />
          )}

          {/* TAB: PRODUCTOS */}
          {activeTab === "productos" && (
            <ProductosTab
              token={token ?? ""}
              productos={productos}
              loadingProductos={loadingProductos}
              categorias={categorias}
              sucursales={sucursales}
              esAdmin={esAdmin}
              hasCloudinary={hasCloudinary}
              onRefresh={refreshProductos}
            />
          )}

          {/* TAB: RESERVACIONES */}
          {activeTab === "reservaciones" && (
            <ReservacionesTab
              token={token ?? ""}
              reservaciones={reservaciones}
              loadingReservaciones={loadingReservaciones}
              onRefresh={refreshReservaciones}
            />
          )}

          {/* TAB: PAGOS */}
          {activeTab === "pagos" && (
            <PagosTab
              token={token ?? ""}
              reservaciones={reservaciones}
              onRefresh={refreshReservaciones}
            />
          )}

          {/* TAB: KANBAN */}
          {activeTab === "kanban" && esStaff && (
            <KanbanTab
              token={token ?? ""}
              reservaciones={reservaciones}
              loadingReservaciones={loadingReservaciones}
              usuarios={usuarios}
              sucursales={sucursales}
              onRefresh={refreshReservaciones}
            />
          )}

          {/* TAB: REPORTES */}
          {activeTab === "reportes" && (
            <ReportesTab
              token={token ?? ""}
              activeStore={activeStore}
            />
          )}

          {/* TAB: SETTINGS */}
          {activeTab === "settings" && (
            <SettingsTab
              token={token}
              esAdmin={esAdmin}
              activeStore={activeStore}
              setActiveStore={setActiveStore}
              storeConfig={storeConfig}
              setTiendas={setTiendas}
            />
          )}
        </div>
      </main>

      {/* CREATE STORE DIALOG MODAL */}
      {isCreateModalOpen && (
        <PortalModal onClose={() => setIsCreateModalOpen(false)} ariaLabel="Crear nueva tienda">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-950 p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white cursor-pointer bg-transparent border-none p-0"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Crear Nueva Tienda</h3>
              <p className="text-xs text-slate-400">Crea una instancia de tienda independiente en la plataforma</p>
            </div>

            <form onSubmit={handleCreateStore} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre de la Tienda</label>
                <input
                  type="text"
                  placeholder="Ej. Distribuidora DM Hub Alimentos"
                  required
                  value={newStoreName}
                  onChange={(e) => setNewStoreName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 text-sm text-slate-100 placeholder:text-slate-650 outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Slug de Acceso (URL)</label>
                <input
                  type="text"
                  placeholder="ej-distribuidora-dmhub"
                  required
                  value={newStoreSlug}
                  onChange={(e) => setNewStoreSlug(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900/60 px-4 text-sm text-slate-100 placeholder:text-slate-650 outline-none focus:border-[#38BDF8] focus:ring-1 focus:ring-[#38BDF8]"
                />
              </div>

              <button
                type="submit"
                disabled={isCreatingStore}
                className="h-12 w-full rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 font-bold shadow-[0_4px_12px_rgba(34,211,166,0.2)] transition-all hover:scale-[1.01] cursor-pointer border-none flex items-center justify-center gap-2"
              >
                {isCreatingStore ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creando Tienda...</span>
                  </>
                ) : (
                  <span>Crear Tienda</span>
                )}
              </button>
            </form>
          </div>
        </PortalModal>
      )}

      {/* CRM CLIENTS CHANGE ROLE MODAL */}
      {isChangeRolModalOpen && (
        <PortalModal onClose={() => setIsChangeRolModalOpen(false)} ariaLabel="Cambiar tipo y rol">
          <div className="w-full max-w-md rounded-2xl border border-slate-800 bg-slate-955 p-6 shadow-2xl space-y-6 relative">
            <button
              onClick={() => setIsChangeRolModalOpen(false)}
              className="absolute right-4 top-4 text-slate-500 hover:text-white cursor-pointer bg-transparent border-none p-0"
            >
              <X size={18} />
            </button>

            <div className="space-y-1">
              <h3 className="text-lg font-black text-white">Cambiar Tipo & Rol</h3>
              <p className="text-xs text-slate-400">Modifica los permisos de {selectedUsuario?.name}</p>
            </div>

            <form onSubmit={handleChangeRolUsuario} className="space-y-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Usuario</label>
                <select
                  value={changeRolForm.tipoUsuario}
                  onChange={(e) => setChangeRolForm({ ...changeRolForm, tipoUsuario: e.target.value })}
                  className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8]"
                >
                  <option value="cliente">Cliente</option>
                  <option value="staff">Personal (Staff)</option>
                </select>
              </div>

              {changeRolForm.tipoUsuario === "staff" && (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Rol de Staff</label>
                    <select
                      value={changeRolForm.rolStaff}
                      onChange={(e) => setChangeRolForm({ ...changeRolForm, rolStaff: e.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8]"
                    >
                      <option value="cajero">Cajero</option>
                      <option value="administrador">Administrador</option>
                      <option value="superadmin">Super Administrador</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sucursal</label>
                    <select
                      value={changeRolForm.sucursalId}
                      onChange={(e) => setChangeRolForm({ ...changeRolForm, sucursalId: e.target.value })}
                      className="h-11 w-full rounded-xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none focus:border-[#38BDF8]"
                    >
                      <option value="">Ninguna sucursal (Sin asignar)</option>
                      {sucursales.map(s => (
                        <option key={s.id} value={s.id}>{s.nombre}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button
                type="submit"
                className="h-11 w-full rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 font-bold transition-all cursor-pointer border-none flex items-center justify-center"
              >
                <span>Guardar Permisos</span>
              </button>
            </form>
          </div>
        </PortalModal>
      )}
    </div>
  );
}
