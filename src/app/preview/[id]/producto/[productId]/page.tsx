"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useClientAuthStore } from "@/stores/useClientAuthStore";
import { useCarrito } from "@/hooks/useCarrito";
import { agregarArticuloCarrito } from "@/lib/api/carrito";
import { getTiendaPorIdOSlug, TiendaDto } from "@/lib/api/admin";
import { obtenerProductoPorId, TProductoDetalle } from "@/lib/api/productos";
import { 
  ArrowLeft, 
  ShoppingCart, 
  Minus, 
  Plus, 
  Loader2, 
  ShoppingBag, 
  Store, 
  User, 
  LogOut,
  ChevronRight,
  ShieldCheck,
  Package,
  Sparkles
} from "lucide-react";
import { toast } from "sonner";
import { ClientAuthModal } from "@/components/features/auth/ClientAuthModal";
import { StorefrontCartDrawer } from "@/components/features/carrito/StorefrontCartDrawer";

export default function ClientProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = (params?.id as string) || "";
  const productId = (params?.productId as string) || "";

  // Store metadata & styling config
  const [store, setStore] = useState<TiendaDto | null>(null);
  const [visualConfig, setVisualConfig] = useState<any>(null);
  const [loadingStore, setLoadingStore] = useState(true);

  // Product detail states
  const [product, setProduct] = useState<TProductoDetalle | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [quantity, setQuantity] = useState(1);

  // Shopping Cart & Auth Modal state
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTab, setAuthModalTab] = useState<"login" | "register">("login");
  const [isAddingToCart, setIsAddingToCart] = useState(false);

  // Client Auth store
  const clientLogout = useClientAuthStore((state) => state.logout);
  const clientUser = useClientAuthStore((state) => state.cliente);
  const clientToken = useClientAuthStore((state) => state.token);
  const isClientAuthenticated = useClientAuthStore((state) => state.isAuthenticated);
  const selectTenant = useClientAuthStore((state) => state.selectTenant);

  // Fetch Cart metadata
  const { items: cartItems, mutate: mutateCart } = useCarrito();
  const totalCartCount = useMemo(() => {
    if (!isClientAuthenticated) return 0;
    return cartItems.reduce((acc, item) => acc + item.cantidad, 0);
  }, [cartItems, isClientAuthenticated]);

  // Load store config & product details
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      try {
        setLoadingStore(true);
        setLoadingProduct(true);

        const storeData = await getTiendaPorIdOSlug(storeId, clientToken || undefined);
        if (isCancelled) return;
        setStore(storeData);

        if (storeData.id) {
          window.localStorage.setItem("active_tenant_id", storeData.id);
          selectTenant(storeData.id);
        }

        if (storeData.configuracionVisual) {
          try {
            const config = typeof storeData.configuracionVisual === "string"
              ? JSON.parse(storeData.configuracionVisual)
              : storeData.configuracionVisual;
            setVisualConfig(config);
          } catch (e) {
            console.error("Error parsing visual config", e);
          }
        }
        setLoadingStore(false);

        const productData = await obtenerProductoPorId(
          productId,
          storeData.id || storeId,
          clientToken || undefined
        );
        if (isCancelled) return;
        setProduct(productData);
      } catch (err) {
        console.error("Error loading product detail page", err);
      } finally {
        if (!isCancelled) {
          setLoadingStore(false);
          setLoadingProduct(false);
        }
      }
    };

    if (storeId && productId) {
      void loadData();
    }

    return () => {
      isCancelled = true;
    };
  }, [storeId, productId, clientToken, selectTenant]);

  useEffect(() => {
    const prodName = product?.nombre || product?.nombreProducto;
    if (prodName && store?.nombre) {
      document.title = `${prodName} – ${store.nombre}`;
    } else {
      document.title = "Detalle del Producto";
    }
  }, [product, store]);

  // Header and Announcement visual styles
  const headerSection = visualConfig?.sections?.find((s: any) => s.type === "header") || 
                        visualConfig?.pages?.[0]?.sections?.find((s: any) => s.type === "header");
  
  const announcementSection = visualConfig?.sections?.find((s: any) => s.type === "announcement") ||
                              visualConfig?.pages?.[0]?.sections?.find((s: any) => s.type === "announcement");

  const headerProps = headerSection?.properties || {};
  const announcementProps = announcementSection?.properties || {};

  const storePrimaryColor = visualConfig?.theme?.accentColor || "#1AB38C";
  const isDark = visualConfig?.theme?.isDark || false;

  const headerBgColor = headerProps.backgroundColor || (isDark ? "#0F172A" : "#FFFFFF");
  const headerTextColor = headerProps.textColor || (isDark ? "#F8FAFC" : "#0F172A");
  const announcementBgColor = announcementProps.backgroundColor || storePrimaryColor;
  const announcementTextColor = announcementProps.textColor || "#FFFFFF";
  const storeLogo = headerProps.logoUrl || "";

  const handleAddToCart = async () => {
    if (!product) return;
    if (!isClientAuthenticated) {
      setAuthModalTab("login");
      setIsAuthModalOpen(true);
      toast.error("Inicia sesión para añadir productos al carrito.");
      return;
    }

    setIsAddingToCart(true);
    try {
      await agregarArticuloCarrito(clientToken || "", { 
        productoId: product.id || product.idProducto, 
        cantidad: quantity 
      });
      toast.success("Producto agregado al carrito.");
      await mutateCart();
      setIsCartDrawerOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo agregar el producto.");
    } finally {
      setIsAddingToCart(false);
    }
  };

  const productStock = product?.stockTotal ?? product?.stockActual ?? 0;

  const incrementQty = () => {
    if (product && quantity < productStock) {
      setQuantity(quantity + 1);
    }
  };

  const decrementQty = () => {
    if (quantity > 1) {
      setQuantity(quantity - 1);
    }
  };

  if (loadingStore || loadingProduct) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#1AB38C]" size={40} />
          <p className="text-sm font-medium text-slate-500">Cargando detalles...</p>
        </div>
      </div>
    );
  }

  if (!product || !store) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6 text-center gap-4">
        <h2 className="text-xl font-bold text-slate-800">Producto no encontrado</h2>
        <p className="text-sm text-slate-500">El producto que buscas no existe o fue retirado de la tienda.</p>
        <Link 
          href={`/preview/${storeId}`} 
          className="h-10 px-5 rounded-xl text-white font-bold text-xs flex items-center justify-center gap-2 border-none transition-all hover:scale-[1.01]"
          style={{ backgroundColor: storePrimaryColor }}
        >
          <ArrowLeft size={14} />
          <span>Volver a la tienda</span>
        </Link>
      </div>
    );
  }

  return (
    <div 
      style={{
        backgroundColor: visualConfig?.theme?.useGradient ? undefined : (visualConfig?.theme?.backgroundColor || "#FFFFFF"),
        backgroundImage: visualConfig?.theme?.useGradient ? (visualConfig?.theme?.backgroundGradient || "none") : "none",
        minHeight: "100vh",
        color: isDark ? "#F8FAFC" : "#0F172A",
        "--accent-color": storePrimaryColor
      } as any}
      className="flex flex-col font-sans"
    >
      {/* Announcement Bar */}
      {announcementSection && (
        <div
          style={{
            backgroundColor: announcementBgColor,
            color: announcementTextColor,
            fontWeight: announcementProps.fontWeight === "Bold" ? "bold" : "normal",
            paddingTop: `${announcementProps.verticalPadding || 8}px`,
            paddingBottom: `${announcementProps.verticalPadding || 8}px`,
          }}
          className="text-center text-xs tracking-wider uppercase px-4 select-none"
        >
          {announcementProps.bannerText || "ENVÍO GRATIS EN PEDIDOS SUPERIORES A Q500"}
        </div>
      )}

      {/* Store Header */}
      <header
        style={{
          backgroundColor: headerBgColor,
          color: headerTextColor,
          borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)"
        }}
        className="py-4 px-6 sticky top-0 z-30 transition-all shadow-sm"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={`/preview/${storeId}`} className="flex items-center gap-3">
            {storeLogo ? (
              <img src={storeLogo} alt={store.nombre} className="h-9 w-auto object-contain rounded-md" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Store size={20} />
              </div>
            )}
            <span className="font-extrabold text-base tracking-tight">{store.nombre}</span>
          </Link>

          {/* Navigation Action Badges */}
          <div className="flex items-center gap-4">
            {/* User Session */}
            {isClientAuthenticated ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-xs font-semibold opacity-90">
                  <User size={14} style={{ color: storePrimaryColor }} />
                  <span className="hidden sm:inline">{clientUser?.nombre}</span>
                </div>
                <button
                  onClick={() => {
                    clientLogout();
                    toast.success("Sesión cerrada.");
                  }}
                  className="p-2 rounded-lg bg-slate-50 hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors border-none cursor-pointer"
                  title="Cerrar Sesión"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthModalTab("login");
                  setIsAuthModalOpen(true);
                }}
                className="text-xs font-bold px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 cursor-pointer"
                style={{ color: storePrimaryColor }}
              >
                Iniciar Sesión
              </button>
            )}

            {/* Shopping Cart Button */}
            <button
              onClick={() => setIsCartDrawerOpen(true)}
              className="relative p-2.5 rounded-lg hover:bg-slate-100 transition-all border-none bg-transparent cursor-pointer"
              style={{ color: headerTextColor }}
            >
              <ShoppingCart size={18} />
              {totalCartCount > 0 && (
                <span 
                  style={{ backgroundColor: storePrimaryColor }}
                  className="absolute -top-1 -right-1 h-5 w-5 rounded-full text-white text-[10px] font-black flex items-center justify-center animate-bounce"
                >
                  {totalCartCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main product section */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col gap-6">
        
        {/* Breadcrumbs & Back */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1 text-xs font-semibold text-slate-400 select-none">
            <Link href={`/preview/${storeId}`} className="hover:text-[var(--accent-color)] transition-colors">
              Inicio
            </Link>
            <ChevronRight size={12} />
            <span className="truncate max-w-[200px]">{product.nombre || product.nombreProducto}</span>
          </div>

          <Link 
            href={`/preview/${storeId}`} 
            className="flex items-center gap-1.5 text-xs font-bold hover:underline"
            style={{ color: storePrimaryColor }}
          >
            <ArrowLeft size={14} />
            <span>Volver a la tienda</span>
          </Link>
        </div>

        {/* Product Grid Card */}
        <div 
          style={{
            backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#FFFFFF",
            borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
          }}
          className="rounded-3xl border p-6 md:p-8 flex flex-col md:flex-row gap-8 shadow-xl shadow-slate-100/50"
        >
          {/* Left Column: Product Image */}
          <div className="w-full md:w-1/2 aspect-square rounded-2xl overflow-hidden bg-slate-50 border border-slate-150 flex items-center justify-center relative group">
            <img 
              src={product.imagenUrl || product.imagenPrincipal || "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&q=80"} 
              alt={product.nombre || product.nombreProducto} 
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-102"
            />
            <span className="absolute top-4 left-4 px-2 py-0.5 rounded bg-slate-900/90 text-white text-[9px] font-black tracking-wider uppercase flex items-center gap-1">
              <Sparkles size={10} className="text-amber-400" />
              <span>Producto Oficial</span>
            </span>
          </div>

          {/* Right Column: Product Info & Actions */}
          <div className="w-full md:w-1/2 flex flex-col justify-between text-left gap-6">
            <div className="space-y-4">
              {/* Product Badge / Category placeholder */}
              <div className="flex gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[9px] font-extrabold uppercase">
                  Categoría ID: {product.categoriaId || "General"}
                </span>
                {productStock > 0 ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-600 text-[9px] font-extrabold uppercase border border-emerald-100">
                    En Stock
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-600 text-[9px] font-extrabold uppercase border border-rose-100">
                    Agotado
                  </span>
                )}
              </div>

              {/* Product Name */}
              <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
                {product.nombre || product.nombreProducto}
              </h1>

              {/* Price Tag */}
              <div className="py-2 border-b border-slate-100/50">
                <span style={{ color: storePrimaryColor }} className="text-3xl font-black">
                  Q {((product.precioDetalle ?? product.precio ?? 0) as number).toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {/* Description */}
              <div className="space-y-2">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Descripción</h4>
                <p className="text-sm text-slate-500 leading-relaxed font-medium">
                  {product.descripcion || "Este es un producto de alta calidad, seleccionado especialmente para brindarte el mejor rendimiento y durabilidad. Disponible para retiro inmediato."}
                </p>
              </div>

              {/* Additional Specs */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100/50">
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  <Package size={14} className="text-slate-400" />
                  <span>Código: {product.sku || product.codigoProducto || "N/A"}</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold">
                  <ShieldCheck size={14} className="text-slate-400" />
                  <span>Garantía de Satisfacción</span>
                </div>
              </div>
            </div>

            {/* Actions Block */}
            {productStock > 0 ? (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  {/* Quantity selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cantidad</label>
                    <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-50 h-11 w-32 justify-between">
                      <button
                        onClick={decrementQty}
                        className="h-10 w-10 flex items-center justify-center hover:text-slate-900 text-slate-400 bg-transparent border-none cursor-pointer"
                      >
                        <Minus size={14} />
                      </button>
                      <span className="text-sm font-extrabold text-slate-700 w-8 text-center select-none">
                        {quantity}
                      </span>
                      <button
                        onClick={incrementQty}
                        className="h-10 w-10 flex items-center justify-center hover:text-slate-900 text-slate-400 bg-transparent border-none cursor-pointer"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 flex flex-col justify-end gap-1.5 pt-5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase select-none">
                      Disponibles: {productStock} unidades
                    </span>
                  </div>
                </div>

                {/* Add to Cart button */}
                <button
                  onClick={handleAddToCart}
                  disabled={isAddingToCart}
                  className="w-full h-12 rounded-xl text-white font-bold text-xs shadow-md transition-all hover:scale-[1.01] cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: storePrimaryColor }}
                >
                  {isAddingToCart ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Agregando...</span>
                    </>
                  ) : (
                    <>
                      <ShoppingCart size={16} />
                      <span>Agregar al Carrito</span>
                    </>
                  )}
                </button>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-center">
                <p className="text-xs font-bold text-slate-500">Este producto se encuentra agotado temporalmente.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer
        style={{
          backgroundColor: isDark ? "rgba(15, 23, 42, 0.4)" : "#0F172A",
          color: "#94A3B8",
          borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.05)" : "1px solid rgba(0, 0, 0, 0.05)"
        }}
        className="py-12 px-6 text-center text-xs font-medium mt-auto"
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Store size={16} />
            <span className="font-bold text-white">{store.nombre}</span>
          </div>
          <span>&copy; {new Date().getFullYear()} {store.nombre}. Todos los derechos reservados.</span>
        </div>
      </footer>

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
        products={product ? [{ id: product.id || product.idProducto, imagenUrl: product.imagenUrl || product.imagenPrincipal || null }] : []}
      />
    </div>
  );
}
