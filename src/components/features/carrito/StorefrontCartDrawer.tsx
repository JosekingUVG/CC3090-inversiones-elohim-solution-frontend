"use client";

import { useEffect, useState, useMemo } from "react";
import { useClientAuthStore } from "@/stores/useClientAuthStore";
import { useCarrito } from "@/hooks/useCarrito";
import { useRouter } from "next/navigation";
import { X, Trash2, Plus, Minus, ShoppingBag, ArrowRight, ArrowLeft, Loader2, CheckCircle, CreditCard, Check } from "lucide-react";
import Image from "next/image";
import { toast } from "sonner";
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
import { getSucursales } from "@/lib/api/admin";

type StorefrontCartDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onOpenAuth: () => void;
  products?: Array<{ id: string; imagenUrl: string | null }>;
};

type TDrawerView = "cart" | "checkout" | "success";

export function StorefrontCartDrawer({ isOpen, onClose, onOpenAuth, products }: StorefrontCartDrawerProps) {
  const router = useRouter();
  const isAuthenticated = useClientAuthStore((state) => state.isAuthenticated);
  const clientToken = useClientAuthStore((state) => state.token);
  
  // Local view state
  const [view, setView] = useState<TDrawerView>("cart");
  const [createdReservationId, setCreatedReservationId] = useState<string | null>(null);

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
          // Si el seleccionado previamente ya no existe en la nueva lista, seleccionar el primero
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
  
  const {
    items,
    total,
    isLoading,
    eliminarItem,
    cambiarCantidad,
    isRemovingItemId,
    stockWarning,
    clearStockWarning,
    mutate: mutateCart,
  } = useCarrito();

  // Close drawer on ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load checkout configuration (branches and stripe settings) when entering checkout view
  useEffect(() => {
    if (view !== "checkout" || !clientToken) return;

    const loadCheckoutConfig = async () => {
      // Load sucursales
      try {
        const branchList = await getSucursales(clientToken);
        setSucursales(branchList);
      } catch (err) {
        console.warn("Could not fetch sucursales:", err);
      }

      // Load Stripe config
      try {
        const config = await obtenerConfigStripe(clientToken);
        if (config && config.publishableKey) {
          setStripePromise(loadStripe(config.publishableKey));
          setStripeKeyAvailable(true);
        }
      } catch (err) {
        console.warn("Stripe not configured or unavailable:", err);
        setStripeKeyAvailable(false);
      }

      // Load saved cards
      void cargarTarjetas();
    };

    void loadCheckoutConfig();
  }, [view, clientToken]);

  const selectedPaymentMethod = paymentMethodChoice || (stripeKeyAvailable ? "tarjeta" : "contra_entrega");

  // Reset drawer state when closed or opened
  const [previousOpen, setPreviousOpen] = useState(isOpen);
  if (previousOpen !== isOpen) {
    setPreviousOpen(isOpen);
    if (!isOpen) {
      setView("cart");
      setCreatedReservationId(null);
      setSelectedSucursalId("");
      setStripeCardMethodId(null);
      setIsProcessingCheckout(false);
    }
  }

  if (!isOpen) return null;

  const handleCheckout = () => {
    setView("checkout");
  };

  const handleProcessCheckout = async () => {
    if (!clientToken) return;
    setIsProcessingCheckout(true);

    try {
      if (selectedPaymentMethod === "contra_entrega") {
        if (!selectedSucursalId) {
          toast.error("Selecciona una sucursal para el retiro.");
          setIsProcessingCheckout(false);
          return;
        }

        // 1. Ensure cod payment method is configured/secured
        await asegurarMetodoContraEntrega(clientToken);
        
        // 2. Create V1 Reservation
        const res = await crearReservacionV1(clientToken, { sucursalId: selectedSucursalId });
        
        toast.success("Reservación creada con éxito.");
        setCreatedReservationId(res.id);
        await mutateCart();
        setView("success");
      } else if (selectedPaymentMethod === "tarjeta") {
        if (!stripeCardMethodId) {
          toast.error("Completa y guarda tu tarjeta de crédito.");
          setIsProcessingCheckout(false);
          return;
        }

        if (sucursales.length === 0) {
          toast.error("No hay sucursales disponibles para esta tienda.");
          setIsProcessingCheckout(false);
          return;
        }
        const fallbackSucursalId = sucursales[0].id;

        // 1. Create V1 Reservation first
        const res = await crearReservacionV1(clientToken, { 
          sucursalId: fallbackSucursalId
        });

        // 2. Create Stripe Payment Intent on the backend
        await crearPaymentIntent(clientToken, res.id, stripeCardMethodId || undefined);
        
        toast.success("Pago con tarjeta procesado con éxito.");
        setCreatedReservationId(res.id);
        await mutateCart();
        setView("success");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al procesar el pago.");
    } finally {
      setIsProcessingCheckout(false);
    }
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

  return (
    <div className="fixed inset-0 z-[100] overflow-hidden select-none">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        {/* Drawer Panel */}
        <div className="w-screen max-w-md transform bg-white shadow-2xl transition-all duration-300 flex flex-col h-full border-l border-slate-100 text-slate-800">
          
          {/* Drawer Header */}
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
            {view === "checkout" ? (
              <button
                onClick={() => setView("cart")}
                className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 border-none bg-transparent cursor-pointer"
              >
                <ArrowLeft size={16} />
                <span>Volver al carrito</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <ShoppingBag size={20} className="text-[#1AB38C]" />
                <h2 className="text-sm font-extrabold text-slate-900">
                  {view === "success" ? "Confirmación" : "Carrito de compras"}
                </h2>
              </div>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-150 hover:text-slate-650 transition-colors cursor-pointer border-none bg-transparent"
            >
              <X size={20} />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto px-6 py-4">
            
            {/* 1. SUCCESS VIEW */}
            {view === "success" && (
              <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-4">
                <div className="h-16 w-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
                  <CheckCircle size={36} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-black text-slate-900">¡Compra completada con éxito!</h3>
                  <p className="text-xs text-slate-500">
                    Tu pedido ha sido procesado de forma correcta.
                  </p>
                </div>
                {createdReservationId && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl w-full text-xs">
                    <span className="text-slate-400 font-bold uppercase tracking-wider block text-[10px]">ID de Pedido / Reserva</span>
                    <span className="font-mono text-slate-800 font-extrabold select-all">{createdReservationId}</span>
                  </div>
                )}
                <button
                  onClick={onClose}
                  className="w-full h-11 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all cursor-pointer border-none mt-4"
                >
                  Entendido
                </button>
              </div>
            )}

            {/* 2. CART VIEW */}
            {view === "cart" && (
              <>
                {stockWarning && (
                  <div className="mb-4 rounded-xl bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 flex justify-between items-start">
                    <span>{stockWarning}</span>
                    <button onClick={clearStockWarning} className="font-bold text-amber-900 hover:underline border-none bg-transparent cursor-pointer">
                      Ok
                    </button>
                  </div>
                )}

                {!isAuthenticated ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-450 border border-slate-100">
                      <ShoppingBag size={28} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Inicia sesión para ver tu carrito</h3>
                    <p className="text-xs text-slate-500 mb-6 max-w-[240px]">
                      Guarda tus productos favoritos y finaliza tu compra de forma rápida y segura.
                    </p>
                    <button
                      onClick={() => {
                        onClose();
                        onOpenAuth();
                      }}
                      className="px-6 py-2.5 rounded-xl bg-[#1AB38C] hover:bg-[#159474] text-white text-xs font-bold shadow-md transition-all cursor-pointer border-none"
                    >
                      Iniciar Sesión
                    </button>
                  </div>
                ) : isLoading ? (
                  <div className="h-full flex items-center justify-center">
                    <div className="animate-pulse text-xs text-slate-450">Cargando carrito...</div>
                  </div>
                ) : items.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center px-4">
                    <div className="h-16 w-16 rounded-full bg-slate-50 flex items-center justify-center mb-4 text-slate-450 border border-slate-100">
                      <ShoppingBag size={28} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mb-1">Tu carrito está vacío</h3>
                    <p className="text-xs text-slate-500 max-w-[220px]">
                      Explora nuestra tienda y añade los productos que más te gusten.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {items.map((item) => (
                      <div 
                        key={item.articuloId} 
                        className="flex gap-4 p-3 rounded-2xl border border-slate-100 hover:border-slate-200 transition-all bg-white"
                      >
                        {/* Product Image */}
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

                        {/* Product Details */}
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div className="text-left">
                            <h4 className="text-xs font-bold text-slate-800 truncate">{item.nombreProducto}</h4>
                            <p className="text-xs font-semibold text-slate-500 mt-0.5">
                              Q {item.precioUnitario.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                            </p>
                          </div>

                          {/* Quantity & Delete Controls */}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-50">
                              <button
                                onClick={() => handleDecreaseQuantity(item.articuloId, item.cantidad)}
                                className="p-1 hover:text-slate-900 text-slate-400 bg-transparent border-none cursor-pointer"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="px-2 text-xs font-bold text-slate-700 min-w-[1.5rem] text-center">
                                {item.cantidad}
                              </span>
                              <button
                                onClick={() => handleIncreaseQuantity(item.articuloId, item.cantidad)}
                                className="p-1 hover:text-slate-900 text-slate-400 bg-transparent border-none cursor-pointer"
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
                )}
              </>
            )}

            {/* 3. CHECKOUT VIEW */}
            {view === "checkout" && (
              <div className="space-y-6">
                
                {/* Product Summary Mini */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Resumen del pedido</span>
                  <div className="space-y-2 bg-slate-50 p-3 rounded-2xl border border-slate-100 max-h-[140px] overflow-y-auto">
                    {items.map((item) => (
                      <div key={item.articuloId} className="flex justify-between items-center text-xs">
                        <span className="text-slate-600 truncate max-w-[200px] text-left">{item.nombreProducto} x {item.cantidad}</span>
                        <span className="font-bold text-slate-800">Q {item.subtotal.toLocaleString("es-GT", { minimumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Select Payment Method */}
                <div className="space-y-3">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-left">Método de Pago</span>
                  <div className="space-y-2">
                    <label className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                      selectedPaymentMethod === "contra_entrega" 
                        ? "border-[#1AB38C] bg-[#1AB38C]/5 shadow-sm" 
                        : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                    }`}>
                      <input 
                        type="radio" 
                        name="drawerPaymentMethod" 
                        checked={selectedPaymentMethod === "contra_entrega"}
                        onChange={() => {
                          setSelectedPaymentMethod("contra_entrega");
                          setStripeCardMethodId(null);
                        }}
                        className="mt-0.5 accent-[#1AB38C]" 
                      />
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-800 block">Pago contra entrega</span>
                        <span className="text-[10px] text-slate-500 block leading-tight">Retiras y pagas físicamente en sucursal</span>
                      </div>
                    </label>

                    {stripeKeyAvailable && (
                      <label className={`flex items-start gap-3 p-3 rounded-2xl border-2 transition-all cursor-pointer ${
                        selectedPaymentMethod === "tarjeta" 
                          ? "border-[#1AB38C] bg-[#1AB38C]/5 shadow-sm" 
                          : "border-slate-100 bg-slate-50/50 hover:border-slate-200"
                      }`}>
                        <input 
                          type="radio" 
                          name="drawerPaymentMethod" 
                          checked={selectedPaymentMethod === "tarjeta"}
                          onChange={() => setSelectedPaymentMethod("tarjeta")}
                          className="mt-0.5 accent-[#1AB38C]" 
                      />
                      <div className="text-left">
                        <span className="text-xs font-bold text-slate-800 block">Tarjeta de crédito / Stripe</span>
                        <span className="text-[10px] text-slate-500 block leading-tight">Pago en línea inmediato y seguro</span>
                      </div>
                    </label>
                    )}
                  </div>
                </div>

                {/* Branch Selection for COD */}
                {selectedPaymentMethod === "contra_entrega" && (
                  <div className="space-y-2 text-left">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Sucursal de retiro</label>
                    {sucursales.length === 0 ? (
                      <p className="text-[10px] text-slate-400 italic">Cargando sucursales...</p>
                    ) : (
                      <select
                        value={selectedSucursalId}
                        onChange={(e) => setSelectedSucursalId(e.target.value)}
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-800 outline-none focus:border-[#1AB38C]"
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
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tus Tarjetas Guardadas</span>
                    
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
                                  ? "border-[#1AB38C] bg-[#1AB38C]/5 shadow-sm" 
                                  : "border-slate-100 bg-slate-50 hover:border-slate-200"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div className={`p-1.5 rounded-lg ${isSelected ? "bg-[#1AB38C]/20 text-[#1AB38C]" : "bg-slate-200 text-slate-500"}`}>
                                  <CreditCard size={16} />
                                </div>
                                <div className="text-left min-w-0">
                                  <span className="text-xs font-bold text-slate-800 block truncate">
                                    {card.alias || `${card.marcaTarjeta || 'Tarjeta'} *${card.ultimosDigitos}`}
                                  </span>
                                  {card.alias && (
                                    <span className="text-[10px] text-slate-500 block truncate">
                                      {card.marcaTarjeta} terminada en {card.ultimosDigitos}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                {isSelected && (
                                  <div className="h-5 w-5 rounded-full bg-[#1AB38C] flex items-center justify-center text-white shrink-0">
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
                                  className="p-1 text-slate-400 hover:text-red-500 rounded-lg hover:bg-slate-100/50 cursor-pointer border-none bg-transparent"
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
                        className="text-xs font-bold text-[#1AB38C] hover:text-[#159474] flex items-center gap-1 bg-transparent border-none cursor-pointer p-1"
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

              </div>
            )}

          </div>

          {/* Drawer Footer */}
          {isAuthenticated && items.length > 0 && view !== "success" && (
            <div className="border-t border-slate-100 p-6 bg-slate-50/50 space-y-4 shrink-0">
              <div className="flex justify-between items-center">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total</span>
                <span className="text-lg font-extrabold text-slate-900">
                  Q {total.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                </span>
              </div>
              
              {view === "cart" ? (
                <button
                  onClick={handleCheckout}
                  className="w-full h-12 rounded-xl bg-[#1AB38C] hover:bg-[#159474] text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer border-none flex items-center justify-center gap-2"
                >
                  Proceder al Pago
                  <ArrowRight size={14} />
                </button>
              ) : (
                <button
                  onClick={handleProcessCheckout}
                  disabled={
                    isProcessingCheckout ||
                    !selectedPaymentMethod ||
                    (selectedPaymentMethod === "contra_entrega" && !selectedSucursalId) ||
                    (selectedPaymentMethod === "tarjeta" && !stripeCardMethodId)
                  }
                  className="w-full h-12 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md hover:shadow-lg transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessingCheckout ? (
                    <>
                      <Loader2 className="animate-spin" size={14} />
                      <span>Procesando pedido...</span>
                    </>
                  ) : (
                    <>
                      <span>Finalizar Compra</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
