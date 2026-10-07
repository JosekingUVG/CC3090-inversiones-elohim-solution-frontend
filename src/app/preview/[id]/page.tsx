"use client";

import { useHydrated } from "@/hooks/useHydrated";

import type { StoreConfig, SectionProperties } from "@/types/store-builder";

import { STORE_LAYOUT } from "@/components/features/portal/constructor/storeLayout";

import { useEffect, useState, useMemo, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/stores/useAuthStore";
import { useClientAuthStore } from "@/stores/useClientAuthStore";
import { useCarrito } from "@/hooks/useCarrito";
import { agregarArticuloCarrito, eliminarArticuloCarrito, actualizarArticuloCarrito } from "@/lib/api/carrito";
import { getTiendaPorIdOSlug, getPlatformProductos, getSucursales, TiendaDto, PlatformProductoDto } from "@/lib/api/admin";
import { 
  Store, 
  ShoppingCart, 
  ArrowLeft, 
  Eye, 
  Sparkles,
  Loader2,
  User,
  LogOut,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  CreditCard,
  Check,
  X
} from "lucide-react";
import { toast } from "sonner";
import { ClientAuthModal } from "@/components/features/auth/ClientAuthModal";
import { StorefrontCartDrawer } from "@/components/features/carrito/StorefrontCartDrawer";
import type { TMetodoPagoGuardado } from "@/types";

// Stripe and payment imports
import { Elements } from "@stripe/react-stripe-js";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { StripeNuevaTarjetaForm } from "@/components/features/pago/StripeNuevaTarjetaForm";
import { 
  guardarMetodoStripe, 
  asegurarMetodoContraEntrega, 
  crearPaymentIntent, 
  obtenerConfigStripe,
  listarMetodosPagoGuardados,
  eliminarMetodoStripe
} from "@/lib/api/pago";
import { crearReservacionV1 } from "@/lib/api/reservacion";

// Helper to detect if a background color is dark
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

// Helper to translate section properties into dynamic React CSS styles
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
    const blurAmount = properties.blur ?? 12;
    styles.backdropFilter = `blur(${blurAmount}px)`;
    styles.WebkitBackdropFilter = `blur(${blurAmount}px)`;
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

export default function LivePreviewPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const token = useAuthStore((state) => state.token);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  // Client authentication store
  const client = useClientAuthStore((state) => state.cliente);
  const clientToken = useClientAuthStore((state) => state.token);
  const isClientAuthenticated = useClientAuthStore((state) => state.isAuthenticated);
  const logoutClient = useClientAuthStore((state) => state.logout);
  const selectTenant = useClientAuthStore((state) => state.selectTenant);



  // Modal / Drawer state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);

  // Cart state and triggers
  const {
    items: cartItems,
    total: cartTotal,
    isLoading: isLoadingCart,
    mutate: mutateCart,
    eliminarItem,
    cambiarCantidad,
    isRemovingItemId,
  } = useCarrito();
  const cartCount = cartItems.reduce((sum, item) => sum + item.cantidad, 0);

  const isHydrated = useHydrated();
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<TiendaDto | null>(null);
  const [products, setProducts] = useState<PlatformProductoDto[]>([]);
  const [visualConfig, setVisualConfig] = useState<StoreConfig | null>(null);
  const [activePageId, setActivePageId] = useState<string>("home");
  const [searchTerm, setSearchTerm] = useState("");
  const [verTodoCatalogo, setVerTodoCatalogo] = useState(false);
  const [paginaActual, setPaginaActual] = useState(1);

  const [paginationSource, setPaginationSource] = useState({ searchTerm, activePageId });
  if (paginationSource.searchTerm !== searchTerm || paginationSource.activePageId !== activePageId) {
    setPaginationSource({ searchTerm, activePageId });
    setPaginaActual(1);
  }

  // Dynamically update the browser tab title and favicon when navigating pages
  useEffect(() => {
    if (!visualConfig || !store) return;
    const page = visualConfig.pages?.find((p) => p.id === activePageId);
    const storeName = store.nombre || "Tienda";
    document.title = (page?.isHome || !page?.name) ? storeName : `${page.name} – ${storeName}`;

    // Update favicon with the store logo if configured
    const headerSec = page?.sections?.find((s) => s.type === "header");
    const logoUrl = headerSec?.properties?.logoUrl;
    let faviconLink = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!faviconLink) {
      faviconLink = document.createElement("link");
      faviconLink.rel = "icon";
      document.head.appendChild(faviconLink);
    }
    faviconLink.href = logoUrl || "/favicon.ico";
  }, [activePageId, visualConfig, store]);

  // Synchronize client session with active store ID
  useEffect(() => {
    if (store?.id) {
      selectTenant(store.id);
    }
  }, [store?.id, selectTenant]);

  const showPreviewBanner = isHydrated && (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1" ||
    window.location.hostname === (process.env.NEXT_PUBLIC_MAIN_DOMAIN || "")
  );

  // Checkout states
  const [sucursales, setSucursales] = useState<import("@/lib/api/admin").SucursalDto[]>([]);
  const [selectedSucursalId, setSelectedSucursalId] = useState("");
  const [paymentMethodChoice, setSelectedPaymentMethod] = useState<"contra_entrega" | "tarjeta" | "">("");
  const [stripePromise, setStripePromise] = useState<Promise<Stripe | null> | null>(null);
  const [stripeKeyAvailable, setStripeKeyAvailable] = useState(false);
  const [stripeCardMethodId, setStripeCardMethodId] = useState<string | null>(null);
  const [isProcessingCheckout, setIsProcessingCheckout] = useState(false);
  const [tarjetas, setTarjetas] = useState<TMetodoPagoGuardado[]>([]);
  const [loadingTarjetas, setLoadingTarjetas] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const cargarTarjetas = async () => {
    if (!clientToken) return;
    try {
      setLoadingTarjetas(true);
      const cards = await listarMetodosPagoGuardados(clientToken);
      setTarjetas(cards);
      if (cards.length > 0) {
        setStripeCardMethodId(prev => {
          if (prev && cards.some(c => c.idMetodoPago === prev)) return prev;
          return cards[0].idMetodoPago;
        });
      } else {
        setStripeCardMethodId(null);
        setShowAddForm(true);
      }
    } catch (err) {
      console.error("Error loading saved cards:", err);
    } finally {
      setLoadingTarjetas(false);
    }
  };

  const getProductImage = (productoId: string) => {
    const prod = products?.find((p) => p.id === productoId);
    return prod?.imagenUrl || null;
  };

  const handleDecreaseQuantity = async (articuloId: string, currentQty: number) => {
    if (currentQty <= 1) {
      await eliminarItem(articuloId);
    } else {
      await cambiarCantidad(articuloId, currentQty - 1);
    }
  };

  const handleIncreaseQuantity = async (articuloId: string, currentQty: number) => {
    await cambiarCantidad(articuloId, currentQty + 1);
  };

  const handleProcessCheckout = async () => {
    if (!clientToken) {
      toast.error("Inicia sesión para finalizar tu compra.");
      return;
    }
    setIsProcessingCheckout(true);

    try {
      if (selectedPaymentMethod === "contra_entrega") {
        if (!selectedSucursalId) {
          toast.error("Selecciona una sucursal para el retiro.");
          setIsProcessingCheckout(false);
          return;
        }

        // 1. Asegurar método contra entrega
        await asegurarMetodoContraEntrega(clientToken);
        
        // 2. Crear Reservación en V1
        const res = await crearReservacionV1(clientToken, { sucursalId: selectedSucursalId });
        
        toast.success(`Reservación creada con éxito. ID: ${res.id}`);
        setSelectedSucursalId("");
        await mutateCart();
      } else if (selectedPaymentMethod === "tarjeta") {
        if (!stripeCardMethodId) {
          toast.error("Completa y guarda tu tarjeta de crédito.");
          setIsProcessingCheckout(false);
          return;
        }

        // 1. Obtener primera sucursal como fallback para la reservación pagada
        if (sucursales.length === 0) {
          toast.error("No hay sucursales configuradas para esta tienda.");
          setIsProcessingCheckout(false);
          return;
        }
        const fallbackSucursalId = sucursales[0].id;

        // 2. Crear Reservación en V1 con Stripe
        const res = await crearReservacionV1(clientToken, { 
          sucursalId: fallbackSucursalId
        });

        // 3. Crear Payment Intent en backend
        const intent = await crearPaymentIntent(clientToken, res.id, stripeCardMethodId || undefined);
        
        toast.success(`Pago con tarjeta iniciado con éxito. Reservación ID: ${res.id}`);
        setStripeCardMethodId(null);
        await mutateCart();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar la compra.");
    } finally {
      setIsProcessingCheckout(false);
    }
  };


  const selectedPaymentMethod = paymentMethodChoice || (stripeKeyAvailable ? "tarjeta" : "contra_entrega");

  useEffect(() => {
    if (!isHydrated) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const activeToken = token || clientToken || "";
        
        // Load store by ID or Slug
        const currentStore = await getTiendaPorIdOSlug(storeId, activeToken);

        setStore(currentStore);

        // Parse visual config
        let config = null;
        if (currentStore.configuracionVisual) {
          try {
            config = typeof currentStore.configuracionVisual === "string"
              ? JSON.parse(currentStore.configuracionVisual)
              : currentStore.configuracionVisual;
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
              storeName: currentStore.nombre,
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
              copyrightText: `© 2026 ${currentStore.nombre}. All rights reserved.`,
              backgroundColor: "#0F172A",
              textColor: "#94A3B8"
            }
          }
        ];

        // Default config fallback
        if (!config || (!config.sections && !config.pages)) {
          config = {
            sections: defaultSections
          };
        }

        // Migrate config to have pages list
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

        // Migrate config to have theme settings
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

        setVisualConfig(config);
        setActivePageId(config.currentPageId || "home");

        // Try to fetch real products for this tenant
        try {
          window.localStorage.setItem("active_tenant_id", currentStore.id);
          const tenantProducts = await getPlatformProductos(activeToken);
          setProducts(tenantProducts);
        } catch (prodErr) {
          console.warn("Could not fetch real products, fallback to mocks", prodErr);
        }

        // Try to fetch sucursales for this tenant
        try {
          const branchList = await getSucursales(activeToken);
          setSucursales(branchList);
        } catch (sucErr) {
          console.warn("Could not fetch sucursales", sucErr);
        }

        // Try to fetch Stripe configuration for this tenant
        const stripeToken = clientToken || token || "";
        if (stripeToken) {
          try {
            const config = await obtenerConfigStripe(stripeToken);
            if (config && config.publishableKey) {
              setStripePromise(loadStripe(config.publishableKey));
              setStripeKeyAvailable(true);
            }
          } catch (stripeErr) {
            console.warn("Stripe configuration not available", stripeErr);
          }
        }

        // Fetch saved cards
        void cargarTarjetas();

      } catch (err) {
        console.error("Error loading preview data", err);
        toast.error("Ocurrió un error al cargar la vista previa.");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [isHydrated, storeId, token, clientToken, isAuthenticated, router]);

  const activePage = visualConfig?.pages?.find((p) => p.id === activePageId) || visualConfig?.pages?.[0];
  const announcementSection = activePage?.sections?.find((s) => s.type === "announcement");
  const productsSection = activePage?.sections?.find((s) => s.type === "products");

  // Get all filtered products (without slicing yet)
  const filteredProducts = useMemo(() => {
    let list = products.map(p => ({
      ...p,
      precio: p.precioDetalle ?? 0
    }));

    if (searchTerm.trim() !== "") {
      const term = searchTerm.toLowerCase();
      list = list.filter((p) =>
        (p.nombre || "").toLowerCase().includes(term) || 
        (p.descripcion || "").toLowerCase().includes(term)
      );
    }

    return list;
  }, [products, searchTerm]);

  // Compute total pages
  const itemsPerPage = productsSection?.properties?.pageSize || 6;
  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);

  const displayProducts = useMemo(() => {
    if (verTodoCatalogo) {
      const start = (paginaActual - 1) * itemsPerPage;
      return filteredProducts.slice(start, start + itemsPerPage);
    }
    return filteredProducts.slice(0, productsSection?.properties?.productsCount || 3);
  }, [filteredProducts, verTodoCatalogo, paginaActual, itemsPerPage, productsSection?.properties?.productsCount]);

  const handleButtonClick = (action?: string, value?: string) => {
    if (!action) return;
    
    if (action === "external_url" && value) {
      if (value.startsWith("http://") || value.startsWith("https://")) {
        window.open(value, "_blank");
      } else {
        window.open(`https://${value}`, "_blank");
      }
    } else if (action === "login") {
      setAuthModalTab("login");
      setIsAuthModalOpen(true);
    } else if (action === "register") {
      setAuthModalTab("register");
      setIsAuthModalOpen(true);
    } else if (action === "section_redirect" && value) {
      const element = document.getElementById(value);
      if (element) {
        element.scrollIntoView({ behavior: "smooth" });
      }
    } else if (action === "page_redirect" && value) {
      setActivePageId(value);
      setVerTodoCatalogo(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#081018] text-white gap-3">
        <Loader2 className="animate-spin text-[#22D3A6]" size={32} />
        <p className="text-sm font-medium text-slate-400">Cargando Vista Previa en Vivo...</p>
      </div>
    );
  }

  if (!store || !visualConfig) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#081018] text-white gap-4 p-6 text-center">
        <Store className="text-slate-600" size={48} />
        <h2 className="text-lg font-bold">Error de Vista Previa</h2>
        <p className="text-sm text-slate-400 max-w-md">No se pudo cargar la tienda o la configuración visual correspondiente.</p>
        <button
          onClick={() => router.push("/portal")}
          className="h-10 px-6 bg-[#22D3A6] text-slate-950 font-bold rounded-xl cursor-pointer border-none"
        >
          Volver al Centro de Control
        </button>
      </div>
    );
  }

  const handleAddToCart = async (productoId: string) => {
    if (!productoId) return;
    if (!isClientAuthenticated) {
      setAuthModalTab("login");
      setIsAuthModalOpen(true);
      toast.error("Inicia sesión para añadir productos al carrito.");
      return;
    }

    try {
      await agregarArticuloCarrito(clientToken || "", { productoId, cantidad: 1 });
      toast.success("Producto agregado al carrito.");
      await mutateCart();
      setIsCartDrawerOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo agregar el producto.");
    }
  };

  return (
    <div
      style={{
        backgroundColor: visualConfig.theme?.useGradient ? undefined : (visualConfig.theme?.backgroundColor || "#FFFFFF"),
        backgroundImage: visualConfig.theme?.useGradient ? (visualConfig.theme?.backgroundGradient || "none") : "none",
        minHeight: "100vh",
        "--accent-color": visualConfig.theme?.accentColor || "#1AB38C"
      } as React.CSSProperties}
      className="text-slate-900 flex flex-col font-sans select-none relative"
    >
      
      {/* TOP NOTIFICATION BAR (PREVIEW BANNER) */}
      {showPreviewBanner && (
        <div className="bg-[#0f172a] text-white py-2.5 px-4 border-b border-slate-800 flex items-center justify-between shrink-0 sticky top-0 z-50 text-xs shadow-md backdrop-blur bg-opacity-95">
          <div className="flex items-center gap-2">
            <Eye size={14} className="text-[#38BDF8]" />
            <span className="font-bold">Modo Vista Previa en Vivo:</span>
            <span className="text-slate-300 font-medium">{store.nombre}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase px-2 py-0.5 rounded bg-slate-900 border border-slate-800">
              {store.slug}
            </span>
            <button
              onClick={() => router.push("/portal?tab=constructor")}
              className="flex items-center gap-1.5 h-7 px-3 bg-[#22D3A6]/10 hover:bg-[#22D3A6]/20 border border-[#22D3A6]/30 text-[#22D3A6] font-bold rounded-lg cursor-pointer transition-all"
            >
              <ArrowLeft size={10} />
              <span>Volver al Editor</span>
            </button>
          </div>
        </div>
      )}
      {activePage?.sections.map((section) => {
        const props = section.properties || {};
        const customStyle = getSectionStyle(props);
        const isDark = props.useGlassmorphism || isDarkBg(props.backgroundColor || "#FFFFFF");

        if (section.type === "announcement") {
          const announcementBg = props.backgroundColor || visualConfig.theme?.accentColor || "#1AB38C";
          return (
            <div
              key={section.id}
              id={section.id}
              style={{
                backgroundColor: announcementBg,
                color: props.textColor || "#FFFFFF",
                padding: `${props.verticalPadding || 8}px 12px`,
                fontWeight: props.fontWeight === "Bold" ? "bold" : "normal",
                ...customStyle
              }}
              className="text-center text-xs tracking-wider transition-all select-none relative w-full"
            >
              {props.linkAction === "Open Link" && props.linkUrl ? (
                <a href={props.linkUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center justify-center gap-1.5 cursor-pointer">
                  <span>{props.bannerText}</span>
                </a>
              ) : (
                <span>{props.bannerText}</span>
              )}
            </div>
          );
        }

        if (section.type === "header") {
          return (
            <header 
              key={section.id} 
              id={section.id}
              style={{
                backgroundColor: props.backgroundColor || "#FFFFFF",
                color: props.textColor || "#0F172A",
                position: props.stickyHeader ? "sticky" : "relative",
                top: props.stickyHeader ? (showPreviewBanner ? "41px" : "0px") : undefined,
                zIndex: 40,
                ...customStyle
              }}
              className={`${STORE_LAYOUT.section} border-b border-slate-200 py-4 transition-all select-none`}
            >
              <div className={`${STORE_LAYOUT.content} flex items-center justify-between`}>
              <div className="flex items-center gap-2.5">
                {props.logoUrl && (
                  <img src={props.logoUrl} alt={props.storeName} className="h-8 max-h-8 max-w-[40px] object-contain flex-shrink-0" />
                )}
                {!props.logoUrl && <Store size={20} style={{ color: props.textColor || "inherit" }} />}
                <span style={{ color: props.textColor || "inherit" }} className="font-black tracking-tight text-base">
                  {props.storeName}
                </span>
              </div>
              <nav className="hidden md:flex items-center gap-8">
                {visualConfig.pages.map((p) => (
                  <span
                    key={p.id}
                    onClick={() => setActivePageId(p.id)}
                    className="text-xs font-bold cursor-pointer transition-colors pb-0.5"
                    style={{
                      color: p.id === activePageId ? (visualConfig.theme?.accentColor || "#1AB38C") : (props.textColor || "#555555"),
                      borderBottomColor: p.id === activePageId ? (visualConfig.theme?.accentColor || "#1AB38C") : "transparent",
                      borderBottomWidth: p.id === activePageId ? 2 : 0,
                      borderBottomStyle: p.id === activePageId ? "solid" : "none"
                    }}
                  >
                    {p.name}
                  </span>
                ))}
              </nav>
              <div style={{ color: props.textColor || "inherit" }} className="flex items-center gap-5">
                <div 
                  onClick={() => setIsCartDrawerOpen(true)}
                  className="relative cursor-pointer hover:opacity-80"
                >
                  <ShoppingCart size={18} />
                  {cartCount > 0 && (
                    <span 
                      style={{ backgroundColor: visualConfig.theme?.accentColor || "#1AB38C" }}
                      className="absolute -top-1.5 -right-1.5 text-white text-[9px] font-black rounded-full h-4 w-4 flex items-center justify-center"
                    >
                      {cartCount}
                    </span>
                  )}
                </div>

                {/* Client user menu */}
                {isClientAuthenticated ? (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => router.push(`/preview/${storeId}/perfil`)}
                      className="flex items-center gap-1.5 text-xs font-bold transition-colors border-none bg-transparent cursor-pointer"
                      style={{ color: props.textColor || "inherit" }}
                      title="Ir a mi perfil"
                    >
                      <User size={16} />
                      <span className="hidden sm:inline truncate max-w-[80px]">{client?.nombre}</span>
                    </button>
                    <button
                      onClick={() => {
                        logoutClient();
                        toast.success("Sesión cerrada");
                      }}
                      className="p-1 rounded text-slate-400 hover:text-red-500 hover:bg-slate-50 transition-colors border-none bg-transparent cursor-pointer flex items-center"
                      title="Cerrar sesión"
                    >
                      <LogOut size={16} />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setAuthModalTab("login");
                      setIsAuthModalOpen(true);
                    }}
                    className="flex items-center gap-1.5 text-xs font-bold transition-colors border-none bg-transparent cursor-pointer"
                    style={{ color: props.textColor || "inherit" }}
                  >
                    <User size={16} />
                    <span className="hidden sm:inline">Ingresar</span>
                  </button>
                )}
              </div>
              </div>
            </header>
          );
        }

        if (section.type === "hero") {
          const theme = visualConfig.theme;
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
              id={section.id}
              style={heroStyle}
              className={`${STORE_LAYOUT.section} relative py-24 text-center flex flex-col items-center justify-center min-h-[400px] transition-all select-none`}
            >
              {hasImage && (
                <div 
                  style={{ backgroundColor: `rgba(0, 0, 0, ${(props.overlayOpacity ?? 55) / 100})` }} 
                  className="absolute inset-0 pointer-events-none" 
                />
              )}
              
              <div className={`${STORE_LAYOUT.content} relative z-10 space-y-6`}>
                <h2 className="text-3xl font-black tracking-tight leading-tight sm:text-5xl text-white drop-shadow-md">
                  {props.title}
                </h2>
                <p className="text-sm sm:text-base text-slate-200/90 leading-relaxed drop-shadow-sm">
                  {props.subtitle}
                </p>
                <div className="flex items-center justify-center gap-4 pt-4">
                  {props.primaryButtonText && (
                    <button
                      onClick={() => handleButtonClick(props.primaryButtonAction, props.primaryButtonValue)}
                      style={{ backgroundColor: visualConfig.theme?.accentColor || "#1AB38C" }}
                      className="h-11 px-8 rounded-lg text-white font-bold text-xs cursor-pointer border-none shadow-lg hover:brightness-110 transition-all transform hover:-translate-y-0.5"
                    >
                      {props.primaryButtonText}
                    </button>
                  )}
                  {props.secondaryButtonText && (
                    <button
                      onClick={() => handleButtonClick(props.secondaryButtonAction, props.secondaryButtonValue)}
                      className="h-11 px-8 rounded-lg bg-transparent border border-white text-white font-bold text-xs cursor-pointer hover:bg-white/10 transition-all transform hover:-translate-y-0.5"
                    >
                      {props.secondaryButtonText}
                    </button>
                  )}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "products") {
          const gridColsClass = 
            props.columns === 2 ? "md:grid-cols-2" : 
            props.columns === 4 ? "md:grid-cols-4" : 
            "md:grid-cols-3";
          
          return (
            <section 
              key={section.id} 
              id={section.id}
              style={{
                backgroundColor: props.backgroundColor || "#FFFFFF",
                color: props.textColor || "#0F172A",
                ...customStyle
              }}
              className={`${STORE_LAYOUT.section} py-16 flex-1`}
            >
              <div className={`${STORE_LAYOUT.content} space-y-8`}>
              <div 
                style={{ borderBottomColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(241, 245, 249, 1)" }}
                className="flex items-center justify-between border-b pb-4"
              >
                <h3 className="text-base font-black uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={16} style={{ color: visualConfig.theme?.accentColor || "#1AB38C" }} />
                  <span>{props.title}</span>
                </h3>
                <span 
                  onClick={() => {
                    setVerTodoCatalogo(!verTodoCatalogo);
                    setPaginaActual(1);
                  }}
                  style={{ color: visualConfig.theme?.accentColor || "#1AB38C" }}
                  className="text-xs font-bold hover:underline cursor-pointer"
                >
                  {verTodoCatalogo ? "← Mostrar destacados" : "Ver todo el catálogo"}
                </span>
              </div>

              {/* Search bar inside product section */}
              {props.showSearch && (
                <div className="relative max-w-md mx-auto mb-8">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar productos..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#F8FAFC",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
                      color: isDark ? "#F8FAFC" : "#0F172A"
                    }}
                    className="w-full h-10 pl-10 pr-10 rounded-xl border outline-none focus:border-[var(--accent-color)] focus:bg-white transition-all shadow-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 bg-transparent border-none cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              )}
              
              {props.layoutType === "list" ? (
                <div className="space-y-4">
                  {displayProducts.map((p, idx: number) => (
                    <div 
                      key={idx} 
                      style={{
                        backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#FFFFFF",
                        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                      }}
                      className="rounded-xl border p-4 flex gap-4 hover:shadow-xl transition-all group cursor-pointer"
                      onClick={() => router.push(`/preview/${storeId}/producto/${p.id}`)}
                    >
                      <div className="h-24 w-24 sm:h-32 sm:w-32 bg-slate-100 rounded-lg overflow-hidden relative flex-shrink-0 flex items-center justify-center">
                        <img 
                          src={p.imagenUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80"} 
                          alt={p.nombre} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" 
                        />
                        <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-slate-900 text-white text-[8px] font-black tracking-wider uppercase">
                          Destacado
                        </span>
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1 min-w-0 text-left">
                        <div className="space-y-1">
                          <h4 
                            style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} 
                            className="text-sm font-bold group-hover:text-[var(--accent-color)] transition-colors truncate"
                          >
                            {p.nombre}
                          </h4>
                          <p style={{ color: isDark ? "#94A3B8" : "#64748B" }} className="text-xs line-clamp-2 leading-relaxed">
                            {p.descripcion || "Producto de alta calidad disponible en nuestra sucursal."}
                          </p>
                        </div>
                        <div className="flex items-center justify-between mt-2 sm:mt-0">
                          <span style={{ color: isDark ? "#CBD5E1" : "#1E293B" }} className="text-sm sm:text-base font-black">
                            Q{typeof p.precio === 'number' ? p.precio.toFixed(2) : p.precio}
                          </span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleAddToCart(p.id);
                            }}
                            style={{
                              backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(241, 245, 249, 1)",
                              color: isDark ? "#F8FAFC" : "#475569"
                            }}
                            className="px-4 py-2 rounded-lg transition-all border-none cursor-pointer flex items-center gap-2 text-xs font-bold"
                          >
                            <ShoppingCart size={13} />
                            <span className="hidden sm:inline">Añadir al Carrito</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {displayProducts.length === 0 && (
                    <div className="text-center py-12 text-slate-400 text-sm">
                      No se encontraron productos que coincidan con tu búsqueda.
                    </div>
                  )}
                </div>
              ) : (
                <div className={`grid gap-6 grid-cols-1 ${gridColsClass}`}>
                  {displayProducts.map((p, idx: number) => (
                    <div 
                      key={idx} 
                      style={{
                        backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#FFFFFF",
                        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                      }}
                      className="rounded-xl border p-4 flex flex-col gap-3.5 hover:shadow-xl transition-all group cursor-pointer"
                      onClick={() => router.push(`/preview/${storeId}/producto/${p.id}`)}
                    >
                      <div className="aspect-square bg-slate-100 rounded-lg overflow-hidden relative flex items-center justify-center">
                        <img 
                          src={p.imagenUrl || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80"} 
                          alt={p.nombre} 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300" 
                        />
                        <span className="absolute top-3 left-3 px-2 py-0.5 rounded bg-slate-955 text-white text-[9px] font-black tracking-wider uppercase">
                          Destacado
                        </span>
                      </div>
                      <div className="flex flex-col gap-1.5 text-left">
                        <h4 
                          style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} 
                          className="text-xs font-bold group-hover:text-[var(--accent-color)] transition-colors truncate"
                        >
                          {p.nombre}
                        </h4>
                        <div className="flex items-center justify-between mt-1">
                          <span style={{ color: isDark ? "#CBD5E1" : "#1E293B" }} className="text-sm font-black">Q{typeof p.precio === 'number' ? p.precio.toFixed(2) : p.precio}</span>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleAddToCart(p.id);
                            }}
                            style={{
                              backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(241, 245, 249, 1)",
                              color: isDark ? "#F8FAFC" : "#475569"
                            }}
                            className="p-1.5 rounded-lg transition-all border-none cursor-pointer flex items-center"
                          >
                            <ShoppingCart size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                  {displayProducts.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400 text-sm">
                      No se encontraron productos que coincidan con tu búsqueda.
                    </div>
                  )}
                </div>
              )}

              {/* Pagination controls */}
              {verTodoCatalogo && totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-8 select-none">
                  <button
                    disabled={paginaActual === 1}
                    onClick={() => setPaginaActual(prev => Math.max(prev - 1, 1))}
                    style={{
                      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
                      backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#FFFFFF",
                      color: isDark ? "#CBD5E1" : "#334155",
                    }}
                    className="h-8 px-3 rounded-lg border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800/10 cursor-pointer flex items-center justify-center gap-1"
                  >
                    Anterior
                  </button>
                  {Array.from({ length: totalPages }).map((_, pageIdx) => {
                    const pageNum = pageIdx + 1;
                    const isActive = paginaActual === pageNum;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPaginaActual(pageNum)}
                        style={{
                          backgroundColor: isActive ? (visualConfig.theme?.accentColor || "#1AB38C") : (isDark ? "rgba(15, 23, 42, 0.4)" : "#FFFFFF"),
                          color: isActive ? "#FFFFFF" : (isDark ? "#CBD5E1" : "#334155"),
                          borderColor: isActive ? "transparent" : (isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"),
                        }}
                        className="h-8 w-8 rounded-lg border text-xs font-bold transition-all hover:opacity-90 cursor-pointer flex items-center justify-center"
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={paginaActual === totalPages}
                    onClick={() => setPaginaActual(prev => Math.min(prev + 1, totalPages))}
                    style={{
                      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
                      backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#FFFFFF",
                      color: isDark ? "#CBD5E1" : "#334155",
                    }}
                    className="h-8 px-3 rounded-lg border text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-800/10 cursor-pointer flex items-center justify-center gap-1"
                  >
                    Siguiente
                  </button>
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
              id={section.id}
              style={{
                backgroundColor: props.backgroundColor || "#FFFFFF",
                color: props.textColor || "#0F172A",
                paddingTop: `${props.paddingVertical || 48}px`,
                paddingBottom: `${props.paddingVertical || 48}px`,
                ...customStyle
              }}
              className="px-8 text-center transition-all select-none relative w-full"
            >
              <div className="max-w-2xl mx-auto space-y-3">
                <h2 className="text-xl font-bold tracking-tight">
                  {props.title || "Título de la Página"}
                </h2>
                <div 
                  style={{ color: props.textColor ? `${props.textColor}dd` : undefined }} 
                  className="text-xs leading-relaxed whitespace-pre-wrap"
                >
                  {props.content || "Contenido descriptivo de tu página..."}
                </div>
              </div>
            </section>
          );
        }

        if (section.type === "custom") {
          const blocks = props.blocks || [];
          return (
            <section
              key={section.id}
              id={section.id}
              style={{
                backgroundColor: props.backgroundColor || "#FFFFFF",
                color: props.textColor || "#0F172A",
                ...customStyle
              }}
              className="py-12 px-6 flex flex-col gap-6 w-full"
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
                        className="w-full max-w-[240px] mx-auto rounded-xl border p-3 flex flex-col gap-2.5"
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
                    Sección vacía.
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
              id={section.id}
              style={{
                backgroundColor: props.backgroundColor || "#FFFFFF",
                color: props.textColor || "#0F172A",
                ...customStyle
              }}
              className="py-16 px-6 max-w-6xl w-full mx-auto space-y-8 flex-1 w-full text-left"
            >
              <div 
                style={{ borderBottomColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(241, 245, 249, 1)" }}
                className="flex items-center gap-3 border-b pb-4"
              >
                <ShoppingBag style={{ color: visualConfig.theme?.accentColor || "#1AB38C" }} size={24} />
                <h2 className="text-xl font-black tracking-tight sm:text-2xl">
                  {props.title || "Tu Carrito de Compras"}
                </h2>
              </div>
              
              {!isClientAuthenticated ? (
                <div 
                  style={{
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#F8FAFC",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                  }}
                  className="text-center py-16 px-4 rounded-2xl border max-w-md mx-auto"
                >
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-450 border border-slate-200 mx-auto">
                    <ShoppingBag size={28} />
                  </div>
                  <h3 style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} className="text-sm font-bold mb-1">Inicia sesión para ver tu carrito</h3>
                  <p style={{ color: isDark ? "#94A3B8" : "#64748B" }} className="text-xs mb-6 max-w-[240px] mx-auto text-center">
                    Guarda tus productos favoritos y finaliza tu compra de forma rápida y segura en nuestra tienda.
                  </p>
                  <button
                    onClick={() => {
                      setAuthModalTab("login");
                      setIsAuthModalOpen(true);
                    }}
                    style={{ backgroundColor: visualConfig.theme?.accentColor || "#1AB38C" }}
                    className="px-6 py-2.5 rounded-xl text-white text-xs font-bold shadow-md transition-all cursor-pointer border-none"
                  >
                    Iniciar Sesión
                  </button>
                </div>
              ) : isLoadingCart ? (
                <div className="text-center py-16 text-slate-500 text-xs">Cargando artículos del carrito...</div>
              ) : cartItems.length === 0 ? (
                <div 
                  style={{
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#F8FAFC",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                  }}
                  className="text-center py-16 px-4 rounded-2xl border max-w-md mx-auto"
                >
                  <div className="h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center mb-4 text-slate-450 border border-slate-200 mx-auto">
                    <ShoppingBag size={28} />
                  </div>
                  <h3 style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} className="text-sm font-bold mb-1">Tu carrito está vacío</h3>
                  <p style={{ color: isDark ? "#94A3B8" : "#64748B" }} className="text-xs max-w-[220px] mx-auto text-center">
                    Explora nuestra tienda y añade los productos que más te gusten.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                  
                  {/* Cart Items List */}
                  <div className="lg:col-span-2 space-y-4">
                    {cartItems.map((item) => (
                      <div 
                        key={item.articuloId} 
                        style={{
                          backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#FFFFFF",
                          borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                        }}
                        className="flex gap-4 p-4 rounded-2xl border transition-all"
                      >
                        <div className="relative h-20 w-20 rounded-xl bg-slate-50 border border-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center">
                          {getProductImage(item.productoId) ? (
                            <img
                              src={getProductImage(item.productoId)!}
                              alt={item.nombreProducto}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ShoppingBag size={20} className="text-slate-350" />
                          )}
                        </div>

                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} className="text-sm font-bold truncate">{item.nombreProducto}</h4>
                            <p style={{ color: isDark ? "#CBD5E1" : "#475569" }} className="text-xs font-semibold mt-0.5">
                              Q {item.precioUnitario.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                            </p>
                          </div>

                          <div className="flex items-center justify-between mt-2">
                            <div 
                              style={{
                                backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#F8FAFC",
                                borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                              }}
                              className="flex items-center border rounded-lg p-0.5"
                            >
                              <button
                                onClick={() => handleDecreaseQuantity(item.articuloId, item.cantidad)}
                                style={{ color: isDark ? "#94A3B8" : "#94A3B8" }}
                                className="p-1 hover:text-slate-900 bg-transparent border-none cursor-pointer"
                              >
                                <Minus size={12} />
                              </button>
                              <span style={{ color: isDark ? "#F8FAFC" : "#334155" }} className="px-2 text-xs font-bold min-w-[1.5rem] text-center">
                                {item.cantidad}
                              </span>
                              <button
                                onClick={() => handleIncreaseQuantity(item.articuloId, item.cantidad)}
                                style={{ color: isDark ? "#94A3B8" : "#94A3B8" }}
                                className="p-1 hover:text-slate-900 bg-transparent border-none cursor-pointer"
                              >
                                <Plus size={12} />
                              </button>
                            </div>

                            <button
                              onClick={() => eliminarItem(item.articuloId)}
                              disabled={isRemovingItemId === item.articuloId}
                              className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-650 transition-colors border-none bg-transparent cursor-pointer disabled:opacity-50"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Checkout Form */}
                  <div 
                    style={{
                      backgroundColor: isDark ? "rgba(15, 23, 42, 0.3)" : "rgba(248, 250, 252, 0.5)",
                      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                    }}
                    className="rounded-2xl border p-6 space-y-6"
                  >
                    <h3 style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} className="text-sm font-black uppercase tracking-wider">Resumen de Compra</h3>
                    
                    <div 
                      style={{ borderBottomColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0" }}
                      className="flex justify-between items-center text-xs border-b pb-3"
                    >
                      <span style={{ color: isDark ? "#CBD5E1" : "#475569" }} className="font-bold">Subtotal</span>
                      <span style={{ color: isDark ? "#F8FAFC" : "#1E293B" }} className="font-bold">
                        Q {cartTotal.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    {/* SELECT PAYMENT METHOD */}
                    <div className="space-y-3">
                      <span style={{ color: isDark ? "#CBD5E1" : "#94A3B8" }} className="text-[10px] font-bold uppercase tracking-wider block">Método de Pago</span>
                      
                      <div className="space-y-2">
                        {(props.showReservations ?? true) && (
                          <label 
                            style={{
                              backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#FFFFFF",
                              borderColor: selectedPaymentMethod === "contra_entrega" 
                                ? (visualConfig.theme?.accentColor || "#1AB38C") 
                                : (isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0")
                            }}
                            className="flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer"
                          >
                            <input 
                              type="radio" 
                              name="paymentMethod" 
                              checked={selectedPaymentMethod === "contra_entrega"}
                              onChange={() => setSelectedPaymentMethod("contra_entrega")}
                              className="mt-0.5 accent-[var(--accent-color)]" 
                            />
                            <div className="text-left">
                              <span style={{ color: isDark ? "#F8FAFC" : "#1E293B" }} className="text-xs font-bold block">Pago contra entrega</span>
                              <span style={{ color: isDark ? "#CBD5E1" : "#64748B" }} className="text-[10px] block leading-tight">Retiras y pagas físicamente en sucursal</span>
                            </div>
                          </label>
                        )}

                        {(props.showCardPayments ?? true) && stripeKeyAvailable && (
                          <label 
                            style={{
                              backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#FFFFFF",
                              borderColor: selectedPaymentMethod === "tarjeta" 
                                ? (visualConfig.theme?.accentColor || "#1AB38C") 
                                : (isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0")
                            }}
                            className="flex items-start gap-3 p-3 rounded-xl border-2 transition-all cursor-pointer"
                          >
                            <input 
                              type="radio" 
                              name="paymentMethod" 
                              checked={selectedPaymentMethod === "tarjeta"}
                              onChange={() => setSelectedPaymentMethod("tarjeta")}
                              className="mt-0.5 accent-[var(--accent-color)]" 
                            />
                            <div className="text-left">
                              <span style={{ color: isDark ? "#F8FAFC" : "#1E293B" }} className="text-xs font-bold block">Tarjeta (Stripe)</span>
                              <span style={{ color: isDark ? "#CBD5E1" : "#64748B" }} className="text-[10px] block leading-tight">Pago en línea seguro con tarjeta de crédito</span>
                            </div>
                          </label>
                        )}
                      </div>
                    </div>

                    {/* BRANCH SELECTION FOR RESERVATION */}
                    {selectedPaymentMethod === "contra_entrega" && (
                      <div className="space-y-2 text-left">
                        <label style={{ color: isDark ? "#CBD5E1" : "#94A3B8" }} className="text-[10px] font-bold uppercase tracking-wider">Sucursal para retiro</label>
                        {sucursales.length === 0 ? (
                          <p className="text-[10px] text-slate-500">Cargando sucursales disponibles...</p>
                        ) : (
                          <select
                            value={selectedSucursalId}
                            onChange={(e) => setSelectedSucursalId(e.target.value)}
                            style={{
                              backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#FFFFFF",
                              borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
                              color: isDark ? "#F8FAFC" : "#0F172A"
                            }}
                            className="h-10 w-full rounded-xl border px-3.5 text-xs outline-none focus:border-[var(--accent-color)]"
                          >
                            <option value="">Selecciona una sucursal</option>
                            {sucursales.map((suc) => (
                              <option key={suc.id} value={suc.id}>{suc.nombre}</option>
                            ))}
                          </select>
                        )}
                      </div>
                    )}

                    {/* Stripe Saved Cards & Form */}
                    {selectedPaymentMethod === "tarjeta" && stripePromise && (
                      <div className="space-y-4 text-left">
                        <span style={{ color: isDark ? "#CBD5E1" : "#94A3B8" }} className="text-[10px] font-bold uppercase tracking-wider block">Tus Tarjetas Guardadas</span>
                        
                        {loadingTarjetas ? (
                          <div className="flex items-center gap-2 py-3 text-xs text-slate-400">
                            <Loader2 className="animate-spin" size={14} />
                            <span>Cargando tarjetas...</span>
                          </div>
                        ) : tarjetas.length === 0 ? (
                          <p className="text-[10px] text-slate-500 italic py-1">No tienes tarjetas registradas aún.</p>
                        ) : (
                          <div className="space-y-2 max-h-[200px] overflow-y-auto pr-1">
                            {tarjetas.map((card) => {
                              const isSelected = stripeCardMethodId === card.idMetodoPago;
                              return (
                                <div 
                                  key={card.idMetodoPago}
                                  onClick={() => setStripeCardMethodId(card.idMetodoPago)}
                                  className={`flex items-center justify-between p-3 rounded-xl border-2 transition-all cursor-pointer ${
                                    isSelected 
                                      ? "shadow-sm" 
                                      : (isDark ? "border-white/10 bg-slate-900/40" : "border-slate-200 bg-white hover:border-slate-350")
                                  }`}
                                  style={isSelected ? {
                                    borderColor: visualConfig.theme?.accentColor || "#1AB38C",
                                    backgroundColor: `${visualConfig.theme?.accentColor || "#1AB38C"}0d`
                                  } : {}}
                                >
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div 
                                      style={isSelected ? {
                                        backgroundColor: `${visualConfig.theme?.accentColor || "#1AB38C"}33`,
                                        color: visualConfig.theme?.accentColor || "#1AB38C"
                                      } : {}}
                                      className={`p-1.5 rounded-lg ${isSelected ? "" : (isDark ? "bg-slate-800 text-slate-400" : "bg-slate-100 text-slate-500")}`}
                                    >
                                      <CreditCard size={16} />
                                    </div>
                                    <div className="text-left min-w-0">
                                      <span style={{ color: isDark ? "#F8FAFC" : "#1E293B" }} className="text-xs font-bold block truncate">
                                        {card.alias || `${card.marcaTarjeta || 'Tarjeta'} *${card.ultimosDigitos}`}
                                      </span>
                                      {card.alias && (
                                        <span style={{ color: isDark ? "#CBD5E1" : "#64748B" }} className="text-[10px] block truncate">
                                          {card.marcaTarjeta} terminada en {card.ultimosDigitos}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0">
                                    {isSelected && (
                                      <div 
                                        style={{ backgroundColor: visualConfig.theme?.accentColor || "#1AB38C" }}
                                        className="h-5 w-5 rounded-full flex items-center justify-center text-white shrink-0"
                                      >
                                        <Check size={12} strokeWidth={3} />
                                      </div>
                                    )}
                                    <button
                                      type="button"
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        if (confirm("¿Estás seguro de que deseas eliminar esta tarjeta?")) {
                                          try {
                                            await eliminarMetodoStripe(clientToken || "", card.idMetodoPago);
                                            toast.success("Tarjeta eliminada con éxito.");
                                            await cargarTarjetas();
                                          } catch (err) {
                                            toast.error(err instanceof Error ? err.message : "Error al eliminar la tarjeta.");
                                          }
                                        }
                                      }}
                                      className="p-1 text-slate-400 hover:text-red-550 rounded-lg hover:bg-slate-100/50 cursor-pointer border-none bg-transparent"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}

                        {/* Button to toggle add new card form */}
                        {tarjetas.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="text-xs font-bold text-[var(--accent-color)] hover:opacity-85 flex items-center gap-1 bg-transparent border-none cursor-pointer p-1"
                          >
                            <Plus size={14} />
                            {showAddForm ? "Ocultar formulario de tarjeta" : "Usar otra tarjeta"}
                          </button>
                        )}

                        {/* Stripe Form Card */}
                        {(showAddForm || tarjetas.length === 0) && (
                          <div className="pt-2 border-t border-slate-100">
                            <Elements stripe={stripePromise}>
                              <StripeNuevaTarjetaForm
                                guardarEnBackend={async (paymentMethodId, alias) => {
                                  return await guardarMetodoStripe(clientToken || "", { stripePaymentMethodId: paymentMethodId, alias });
                                }}
                                onListo={async (metodo) => {
                                  toast.success("Tarjeta registrada y enlazada correctamente.");
                                  setShowAddForm(false);
                                  await cargarTarjetas();
                                  setStripeCardMethodId(metodo.idMetodoPago);
                                }}
                              />
                            </Elements>
                          </div>
                        )}
                      </div>
                    )}

                    <div 
                      style={{ borderTopColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0" }}
                      className="flex justify-between items-center text-xs border-t pt-3"
                    >
                      <span style={{ color: isDark ? "#CBD5E1" : "#475569" }} className="font-extrabold">Total a pagar</span>
                      <span style={{ color: isDark ? "#F8FAFC" : "#1E293B" }} className="text-lg font-black">
                        Q {cartTotal.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <button
                      onClick={handleProcessCheckout}
                      disabled={
                        isProcessingCheckout ||
                        !selectedPaymentMethod ||
                        (selectedPaymentMethod === "contra_entrega" && !selectedSucursalId) ||
                        (selectedPaymentMethod === "tarjeta" && !stripeCardMethodId)
                      }
                      style={{ backgroundColor: visualConfig.theme?.accentColor || "#1AB38C" }}
                      className="w-full h-11 rounded-xl text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isProcessingCheckout ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          <span>Procesando...</span>
                        </>
                      ) : (
                        <>
                          <span>Finalizar Compra</span>
                          <ArrowRight size={14} />
                        </>
                      )}
                    </button>

                  </div>
                </div>
              )}
            </section>
          );
        }

        if (section.type === "footer") {
          return (
            <footer
              key={section.id}
              id={section.id}
              style={{
                backgroundColor: props.backgroundColor || "#0F172A",
                color: props.textColor || "#94A3B8",
                ...customStyle
              }}
              className={`${STORE_LAYOUT.section} py-12 text-center text-xs font-medium border-t border-slate-800`}
            >
              <div className={`${STORE_LAYOUT.content} flex flex-col sm:flex-row items-center justify-between gap-4`}>
                <div className="flex items-center gap-2">
                  <Store size={16} />
                  <span className="font-bold text-white">{store.nombre}</span>
                </div>
                <span>{props.copyrightText}</span>
              </div>
            </footer>
          );
        }

        return null;
      })}

      {/* Auth Modal & Cart Drawer */}
      <ClientAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialTab={authModalTab}
      />
      <StorefrontCartDrawer
        isOpen={isCartDrawerOpen}
        onClose={() => setIsCartDrawerOpen(false)}
        onOpenAuth={() => {
          setAuthModalTab("login");
          setIsAuthModalOpen(true);
        }}
        products={displayProducts}
      />
    </div>
  );
}
