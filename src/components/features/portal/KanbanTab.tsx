"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import {
  Play,
  Pause,
  RefreshCw,
  Search,
  Building,
  User,
  Mail,
  DollarSign,
  CheckCircle2,
  Truck,
  AlertCircle,
  Calendar,
  ArrowRight,
  Clock,
  Volume2,
  Package,
  Layers,
  ChevronRight,
  ArrowLeftRight,
  XCircle
} from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoReservacion, type ReservacionDto, type PlatformUsuarioDto, type SucursalDto } from "@/lib/api/admin";
import { cn } from "@/lib/utils";
import { PortalModal } from "@/components/ui/PortalModal";

interface KanbanTabProps {
  token: string;
  reservaciones: ReservacionDto[];
  loadingReservaciones: boolean;
  usuarios: PlatformUsuarioDto[];
  sucursales: SucursalDto[];
  onRefresh: () => void;
}

type ColumnId = "pendiente_pago" | "pagado_procesando" | "despachado";

interface Column {
  id: ColumnId;
  color: string;
  borderColor: string;
  badgeBg: string;
  glowColor: string;
}

const COLUMNS: Column[] = [
  {
    id: "pendiente_pago",
    color: "text-amber-400 border-amber-500/20",
    badgeBg: "bg-amber-500/10 text-amber-400",
    borderColor: "border-amber-500/15",
    glowColor: "shadow-amber-500/5"
  },
  {
    id: "pagado_procesando",
    color: "text-[#22D3A6] border-[#22D3A6]/20",
    badgeBg: "bg-[#22D3A6]/10 text-[#22D3A6]",
    borderColor: "border-[#22D3A6]/15",
    glowColor: "shadow-[#22D3A6]/5"
  },
  {
    id: "despachado",
    color: "text-[#38BDF8] border-[#38BDF8]/20",
    badgeBg: "bg-[#38BDF8]/10 text-[#38BDF8]",
    borderColor: "border-[#38BDF8]/15",
    glowColor: "shadow-[#38BDF8]/5"
  }
];

export function KanbanTab({
  token,
  reservaciones,
  loadingReservaciones,
  usuarios,
  sucursales,
  onRefresh
}: KanbanTabProps) {
  const t = useTranslations("Kanban");
  const columnTitles: Record<ColumnId, string> = {
    pendiente_pago: t("column_pendiente_pago"),
    pagado_procesando: t("column_pagado_procesando"),
    despachado: t("column_despachado"),
  };
  // Search & Filtering States
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSucursal, setSelectedSucursal] = useState("all");

  // Real-time Polling States
  const [isPollingActive, setIsPollingActive] = useState(true);
  const [isPollingPaused, setIsPollingPaused] = useState(false);
  const [countdown, setCountdown] = useState(6);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Drag & Drop States
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ColumnId | null>(null);

  // Card detail modal state for mobile
  const [selectedCardDetail, setSelectedCardDetail] = useState<ReservacionDto | null>(null);

  // Sound effects enabled state
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Tracking for new orders
  const prevReservationIdsRef = useRef<string[]>([]);

  // Synthesize a beautiful premium notification chime using Web Audio API
  const playSynthSound = (type: "new" | "success" | "drag") => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();

      const now = ctx.currentTime;

      if (type === "new") {
        // Double-bell chime
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = "sine";
        osc1.frequency.setValueAtTime(880, now); // A5
        osc1.frequency.exponentialRampToValueAtTime(1320, now + 0.15); // E6
        gain1.gain.setValueAtTime(0.12, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.7);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = "triangle";
        osc2.frequency.setValueAtTime(1100, now + 0.08); // C#6
        gain2.gain.setValueAtTime(0.08, now + 0.08);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);

        osc1.start(now);
        osc1.stop(now + 0.75);
        osc2.start(now + 0.08);
        osc2.stop(now + 0.55);
      } else if (type === "success") {
        // Happy sweep success chime
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, now); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.42);
      } else if (type === "drag") {
        // Tactile micro popup click
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.exponentialRampToValueAtTime(150, now + 0.05);
        gain.gain.setValueAtTime(0.05, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now);
        osc.stop(now + 0.07);
      }
    } catch (e) {
      console.warn("Web Audio API not allowed or supported yet.", e);
    }
  };

  // Notification chime when new reservations arrive
  useEffect(() => {
    if (reservaciones && reservaciones.length > 0) {
      const currentIds = reservaciones.map((r) => r.id);
      if (prevReservationIdsRef.current.length > 0) {
        const hasNew = currentIds.some((id) => !prevReservationIdsRef.current.includes(id));
        if (hasNew) {
          playSynthSound("new");
          toast(t("toast_new_order_title"), {
            className: "bg-slate-900 border border-slate-800 text-white font-sans rounded-xl",
            description: t("toast_new_order_desc")
          });
        }
      }
      prevReservationIdsRef.current = currentIds;
    }
  }, [reservaciones]);

  // Real-time polling countdown logic
  useEffect(() => {
    if (isPollingActive && !isPollingPaused) {
      pollingIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            onRefresh();
            return 6;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [isPollingActive, isPollingPaused, onRefresh]);

  // Reset countdown on manual refresh
  const handleManualRefresh = () => {
    onRefresh();
    setCountdown(6);
    playSynthSound("success");
    toast.success(t("toast_synced"));
  };

  // Resolve user info from user master list
  const getUserDetails = (userId: string) => {
    const user = usuarios.find((u) => u.id === userId);
    return user
      ? { name: user.name, email: user.email }
      : { name: t("guest_client"), email: t("no_email") };
  };

  // Resolve sucursal name
  const getSucursalName = (sucursalId: string) => {
    const suc = sucursales.find((s) => s.id === sucursalId);
    return suc ? suc.nombre : t("unassigned_branch");
  };

  // Classify reservations into their corresponding lifecycle column
  const getReservationColumn = (res: ReservacionDto): ColumnId => {
    if (res.estadoDespacho === "despachado" || res.estadoDespacho === "entregado") {
      return "despachado";
    }
    if (res.estadoPago === "pagado") {
      return "pagado_procesando";
    }
    return "pendiente_pago";
  };

  // Drag & drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedId(id);
    playSynthSound("drag");
    // Add visual styling to the dragged node
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, columnId: ColumnId) => {
    e.preventDefault();
    if (dragOverColumn !== columnId) {
      setDragOverColumn(columnId);
    }
  };

  const handleDragLeave = () => {
    setDragOverColumn(null);
  };

  const handleDrop = async (e: React.DragEvent, targetColumnId: ColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    const id = e.dataTransfer.getData("text/plain") || draggedId;
    if (!id) return;

    setDraggedId(null);
    await updateReservationStatus(id, targetColumnId);
  };

  const COLUMN_RANKS: Record<ColumnId, number> = {
    pendiente_pago: 1,
    pagado_procesando: 2,
    despachado: 3
  };

  // Update status function (centralized for drag & drop + quick action buttons)
  const updateReservationStatus = async (id: string, targetColumnId: ColumnId) => {
    const res = reservaciones.find((r) => r.id === id);
    if (!res) return;

    const currentColumn = getReservationColumn(res);
    if (COLUMN_RANKS[targetColumnId] < COLUMN_RANKS[currentColumn]) {
      toast.error("No está permitido regresar un pedido a un estado anterior. Solo se permite avanzar en el flujo o cancelarlo.");
      return;
    }

    let targetEstadoPago = res.estadoPago;
    let targetEstadoDespacho = res.estadoDespacho;

    if (targetColumnId === "pendiente_pago") {
      targetEstadoPago = "pendiente";
      targetEstadoDespacho = "procesando";
    } else if (targetColumnId === "pagado_procesando") {
      targetEstadoPago = "pagado";
      targetEstadoDespacho = "procesando";
    } else if (targetColumnId === "despachado") {
      targetEstadoDespacho = "despachado";
    }

    // Skip if no changes
    if (res.estadoPago === targetEstadoPago && res.estadoDespacho === targetEstadoDespacho) {
      return;
    }

    setIsPollingPaused(true);
    const loadingToast = toast.loading(t("toast_updating"));

    try {
      await cambiarEstadoReservacion(token, id, {
        estadoPago: targetEstadoPago,
        estadoDespacho: targetEstadoDespacho
      });
      toast.dismiss(loadingToast);
      toast.success(t("toast_moved_success", { code: id.substring(0, 8).toUpperCase() }), {
        icon: "🚀"
      });
      playSynthSound("success");
      onRefresh();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error((err instanceof Error ? err.message : "") || t("toast_update_error"));
    } finally {
      setTimeout(() => setIsPollingPaused(false), 2500);
    }
  };

  // Cancel order function (returns stock)
  const cancelarPedido = async (id: string) => {
    if (!confirm("¿Está seguro de que desea cancelar este pedido? Los productos reservados/comprados serán devueltos al stock del inventario automáticamente.")) {
      return;
    }

    setIsPollingPaused(true);
    const loadingToast = toast.loading("Cancelando pedido y reintegrando existencias...");

    try {
      await cambiarEstadoReservacion(token, id, {
        estadoPago: "cancelado",
        estadoDespacho: "cancelado"
      });
      toast.dismiss(loadingToast);
      toast.success(`Pedido #${id.substring(0, 8).toUpperCase()} cancelado exitosamente. Productos devueltos al stock.`, {
        icon: "📦"
      });
      playSynthSound("success");
      setSelectedCardDetail(null);
      onRefresh();
    } catch (err) {
      toast.dismiss(loadingToast);
      toast.error((err instanceof Error ? err.message : "") || "No se pudo cancelar la reservación.");
    } finally {
      setTimeout(() => setIsPollingPaused(false), 2500);
    }
  };

  // Filter reservations based on search query and sucursal
  const filteredReservations = reservaciones.filter((res) => {
    const user = usuarios.find((u) => u.id === res.usuarioId);
    const searchMatch =
      res.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user?.name ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user?.email ?? "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      res.montoTotal.toString().includes(searchQuery);

    const sucursalMatch = selectedSucursal === "all" || res.sucursalId === selectedSucursal;

    return searchMatch && sucursalMatch;
  });

  // Calculate Column aggregates
  const getColumnData = (columnId: ColumnId) => {
    const items = filteredReservations.filter((r) => getReservationColumn(r) === columnId);
    const totalAmount = items.reduce((sum, r) => sum + r.montoTotal, 0);
    return { items, totalAmount };
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black tracking-tight text-white flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#22D3A6] animate-pulse" />
            {t("header_title")}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {t("header_subtitle")}
          </p>
        </div>

        {/* Real-time configuration controls */}
        <div className="flex items-center gap-3 self-start md:self-auto bg-slate-900/60 p-1.5 px-3 rounded-xl border border-slate-800 text-xs">
          <div className="flex items-center gap-2 border-r border-slate-800 pr-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={cn(
                "p-1.5 rounded-lg border border-transparent transition-all cursor-pointer bg-transparent",
                soundEnabled ? "text-[#22D3A6] hover:bg-[#22D3A6]/10" : "text-slate-500 hover:bg-slate-800"
              )}
              title={soundEnabled ? t("sound_disable") : t("sound_enable")}
            >
              <Volume2 size={14} className={cn(!soundEnabled && "opacity-50")} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-slate-450 font-medium">{t("auto_refresh_label")}</span>
            <button
              onClick={() => setIsPollingActive(!isPollingActive)}
              className={cn(
                "flex items-center gap-1.5 px-2 py-1 rounded-lg border font-bold tracking-wide transition-all cursor-pointer text-[10px] uppercase",
                isPollingActive
                  ? "border-[#22D3A6]/20 bg-[#22D3A6]/5 text-[#22D3A6]"
                  : "border-slate-800 bg-slate-950 text-slate-550"
              )}
            >
              {isPollingActive ? (
                <>
                  <Play size={10} className="animate-pulse" />
                  <span>{t("live_status", { countdown })}</span>
                </>
              ) : (
                <>
                  <Pause size={10} />
                  <span>{t("paused_status")}</span>
                </>
              )}
            </button>

            <button
              onClick={handleManualRefresh}
              disabled={loadingReservaciones}
              className="p-1.5 rounded-lg border border-slate-850 bg-slate-950 hover:bg-slate-900 text-slate-300 hover:text-white cursor-pointer transition-all disabled:opacity-50 flex items-center justify-center"
              title={t("sync_now")}
            >
              <RefreshCw size={12} className={cn(loadingReservaciones && "animate-spin text-[#22D3A6]")} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {COLUMNS.map((col) => {
          const { items, totalAmount } = getColumnData(col.id);
          return (
            <div
              key={col.id}
              className="p-4 rounded-xl border border-slate-900 bg-slate-955/35 backdrop-blur-md flex items-center justify-between shadow-lg"
            >
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{columnTitles[col.id]}</p>
                <h4 className="text-lg font-black text-white mt-1 leading-none">
                  {items.length} <span className="text-xs font-semibold text-slate-500">{t("orders_suffix")}</span>
                </h4>
              </div>
              <div className="text-right">
                <span className={cn("text-xs font-black px-2 py-1 rounded-lg", col.badgeBg)}>
                  Q{totalAmount.toFixed(2)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Filter and search bar */}
      <div className="flex flex-col md:flex-row gap-3 bg-slate-950/20 p-4 rounded-xl border border-slate-900">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
          <input
            type="text"
            placeholder={t("search_placeholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 h-10 rounded-lg border border-slate-850 bg-slate-900/30 text-xs placeholder:text-slate-500 text-slate-100 outline-none transition-all focus:border-[#22D3A6]/45 focus:ring-1 focus:ring-[#22D3A6]/10"
          />
        </div>

        <div className="flex items-center gap-2">
          <Building size={14} className="text-slate-500" />
          <select
            value={selectedSucursal}
            onChange={(e) => setSelectedSucursal(e.target.value)}
            className="h-10 px-3 rounded-lg border border-slate-850 bg-slate-900/40 text-xs text-slate-350 outline-none focus:border-[#22D3A6]/45 cursor-pointer max-w-[200px] truncate"
          >
            <option value="all">{t("all_branches")}</option>
            {sucursales.map((suc) => (
              <option key={suc.id} value={suc.id}>
                {suc.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board Container */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start min-h-[500px]">
        {COLUMNS.map((col) => {
          const { items } = getColumnData(col.id);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.id)}
              className={cn(
                "rounded-xl border bg-slate-950/40 p-4 transition-all duration-200 flex flex-col max-h-[700px] shadow-2xl relative",
                col.borderColor,
                isOver ? "bg-slate-900/50 scale-[1.01] border-[#22D3A6]/30 shadow-2xl ring-1 ring-[#22D3A6]/10" : "",
                col.glowColor
              )}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-900/80 mb-4 shrink-0">
                <span className={cn("text-xs font-bold tracking-tight uppercase flex items-center gap-1.5", col.color)}>
                  {col.id === "pendiente_pago" && <AlertCircle size={14} />}
                  {col.id === "pagado_procesando" && <Clock size={14} />}
                  {col.id === "despachado" && <Truck size={14} />}
                  {columnTitles[col.id]}
                </span>
                <span className={cn("text-[10px] font-black px-2 py-0.5 rounded-full", col.badgeBg)}>
                  {items.length}
                </span>
              </div>

              {/* Column Items Scroll Container */}
              <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-[250px] scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                {items.length === 0 ? (
                  <div className="h-32 rounded-lg border border-dashed border-slate-900 flex flex-col items-center justify-center text-center p-4">
                    <Layers className="text-slate-800 mb-1" size={24} />
                    <p className="text-[10px] text-slate-600 font-medium">{t("empty_column")}</p>
                  </div>
                ) : (
                  items.map((res) => {
                    const client = getUserDetails(res.usuarioId);
                    const sucursalName = getSucursalName(res.sucursalId);
                    const orderCode = res.id.substring(0, 8).toUpperCase();
                    const isCardDragged = draggedId === res.id;

                    return (
                      <div
                        key={res.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, res.id)}
                        className={cn(
                          "p-3.5 rounded-xl border border-slate-900/60 bg-slate-950/70 hover:bg-slate-900/60 transition-all duration-200 cursor-grab active:cursor-grabbing hover:border-slate-850 shadow-md group relative overflow-hidden",
                          isCardDragged ? "opacity-35 scale-95 border-dashed" : ""
                        )}
                      >
                        {/* Decorative side border */}
                        <div
                          className={cn(
                            "absolute top-0 left-0 bottom-0 w-1 rounded-l-full",
                            res.estadoPago === "pagado" ? "bg-[#22D3A6]" : "bg-amber-400"
                          )}
                        />

                        {/* Top Info */}
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-2">
                          <span className="font-mono font-black text-slate-300">
                            #{orderCode}
                          </span>
                          <span className="flex items-center gap-1 font-medium">
                            <Clock size={10} />
                            {new Date(res.fechaReserva).toLocaleDateString()}
                          </span>
                        </div>

                        {/* Customer details */}
                        <div className="space-y-1 mb-3 pl-1">
                          <p className="text-[11px] font-bold text-white tracking-wide truncate">
                            {client.name}
                          </p>
                          <p className="text-[9px] text-slate-450 truncate flex items-center gap-1">
                            <Mail size={9} className="text-slate-600 shrink-0" />
                            {client.email}
                          </p>
                          <p className="text-[9px] text-slate-500 flex items-center gap-1 truncate">
                            <Building size={9} className="text-slate-650 shrink-0" />
                            {sucursalName}
                          </p>
                        </div>

                        {/* Status Badges */}
                        <div className="flex flex-wrap gap-1.5 mt-1.5 mb-2.5 pl-1">
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                            res.estadoPago === "pagado" ? "bg-emerald-500/10 text-emerald-400" : "bg-amber-500/10 text-amber-400"
                          )}>
                            {t("payment_label", { status: res.estadoPago === "pagado" ? t("payment_verified") : t("payment_pending") })}
                          </span>
                          <span className={cn(
                            "px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider",
                            (res.estadoDespacho === "despachado" || res.estadoDespacho === "entregado") ? "bg-blue-500/10 text-blue-400" : "bg-rose-500/10 text-rose-400"
                          )}>
                            {t("dispatch_label", { status: (res.estadoDespacho === "despachado" || res.estadoDespacho === "entregado") ? t("column_despachado") : t("payment_pending") })}
                          </span>
                        </div>

                        {/* Product item summary */}
                        <div className="border-t border-b border-slate-900/90 py-2 my-2.5 space-y-0.5 text-[9px] text-slate-400 pl-1">
                          <div className="flex items-center justify-between text-slate-500 font-bold uppercase tracking-wider mb-1">
                            <span>{t("items_count", { count: res.detalles.reduce((sum, d) => sum + d.cantidad, 0) })}</span>
                            <Package size={10} />
                          </div>
                          {res.detalles.slice(0, 2).map((d, index) => (
                            <div key={index} className="flex justify-between font-medium">
                              <span className="truncate max-w-[120px]">• {d.productoNombre ?? t("item_fallback")}</span>
                              <span className="text-slate-550 text-[8px] font-bold shrink-0 ml-1">x{d.cantidad}</span>
                            </div>
                          ))}
                          {res.detalles.length > 2 && (
                            <p className="text-[8px] text-[#38BDF8] font-bold mt-1">
                              {t("more_products", { count: res.detalles.length - 2 })}
                            </p>
                          )}
                        </div>

                        {/* Footer - Price and Quick Actions */}
                        <div className="flex items-center justify-between pt-1">
                          <div>
                            <span className="text-[9px] font-bold text-slate-500 uppercase block tracking-widest leading-none">{t("total_label")}</span>
                            <span className="text-xs font-black text-[#22D3A6] mt-1 inline-block">
                              Q{res.montoTotal.toFixed(2)}
                            </span>
                          </div>

                          {/* Quick buttons */}
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setSelectedCardDetail(res)}
                              className="p-1 px-1.5 rounded-lg border border-slate-900 bg-slate-955 text-[9px] font-bold text-slate-400 hover:text-white hover:bg-slate-900 cursor-pointer transition-all"
                              title={t("view_tooltip")}
                            >
                              {t("view_button")}
                            </button>

                            {/* Column conditional actions */}
                            {col.id === "pendiente_pago" && (
                              <button
                                onClick={() => updateReservationStatus(res.id, "pagado_procesando")}
                                className="p-1 px-1.5 rounded-lg bg-[#22D3A6]/10 hover:bg-[#22D3A6] border border-transparent text-[#22D3A6] hover:text-slate-955 text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-0.5"
                                title={t("verify_tooltip")}
                              >
                                {t("verify_button")}
                              </button>
                            )}

                            {col.id === "pagado_procesando" && (
                              <button
                                onClick={() => updateReservationStatus(res.id, "despachado")}
                                className="p-1 px-1.5 rounded-lg bg-[#38BDF8]/10 hover:bg-[#38BDF8] border border-transparent text-[#38BDF8] hover:text-slate-955 text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all flex items-center gap-0.5"
                                title={t("dispatch_tooltip")}
                              >
                                {t("dispatch_button")}
                              </button>
                            )}

                            {/* Quick cancel action */}
                            {res.estadoPago !== "cancelado" && res.estadoDespacho !== "cancelado" && (
                              <button
                                onClick={() => cancelarPedido(res.id)}
                                className="p-1 px-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500 border border-transparent text-rose-400 hover:text-white text-[9px] font-black uppercase tracking-wider cursor-pointer transition-all"
                                title="Cancelar pedido y regresar productos al stock"
                              >
                                Cancelar
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* MOBILE/TABLET QUICK DETAIL & STATE CONTROLLER MODAL */}
      {selectedCardDetail && (
        <PortalModal onClose={() => setSelectedCardDetail(null)} ariaLabel={t("aria_detail")}>
          <div className="w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-955 p-6 shadow-2xl space-y-6 relative text-xs">
            {/* Close Button */}
            <button
              onClick={() => setSelectedCardDetail(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white cursor-pointer bg-transparent border-none p-1"
            >
              {t("close_button")}
            </button>

            {/* Header info */}
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-[10px] font-mono font-black text-white">
                  {t("order_prefix", { code: selectedCardDetail.id.substring(0, 8).toUpperCase() })}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                  selectedCardDetail.estadoPago === "pagado" ? "bg-emerald-500/10 text-emerald-400" : selectedCardDetail.estadoPago === "cancelado" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
                )}>
                  {t("payment_label", { status: selectedCardDetail.estadoPago === "pagado" ? t("payment_verified") : selectedCardDetail.estadoPago === "cancelado" ? "Cancelado" : t("payment_pending") })}
                </span>
                <span className={cn(
                  "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider",
                  (selectedCardDetail.estadoDespacho === "despachado" || selectedCardDetail.estadoDespacho === "entregado") ? "bg-blue-500/10 text-blue-400" : selectedCardDetail.estadoDespacho === "cancelado" ? "bg-rose-500/10 text-rose-400" : "bg-amber-500/10 text-amber-400"
                )}>
                  {t("dispatch_label", { status: (selectedCardDetail.estadoDespacho === "despachado" || selectedCardDetail.estadoDespacho === "entregado") ? t("column_despachado") : selectedCardDetail.estadoDespacho === "cancelado" ? "Cancelado" : t("payment_pending") })}
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-3">{t("detail_title")}</h3>
              <p className="text-slate-500 text-[10px] mt-0.5">
                {t("registered_on", { date: new Date(selectedCardDetail.fechaReserva).toLocaleString("es-ES") })}
              </p>
            </div>

            {/* Client Detail */}
            <div className="bg-slate-900/40 p-4 rounded-xl border border-slate-900 space-y-2">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("billing_info_title")}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-slate-300">
                <div>
                  <p className="text-[10px] text-slate-500">{t("client_name_label")}</p>
                  <p className="font-bold text-white mt-0.5">{getUserDetails(selectedCardDetail.usuarioId).name}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">{t("email_label")}</p>
                  <p className="font-semibold text-[#38BDF8] mt-0.5">{getUserDetails(selectedCardDetail.usuarioId).email}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">{t("delivery_branch_label")}</p>
                  <p className="font-semibold text-white mt-0.5">{getSucursalName(selectedCardDetail.sucursalId)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500">{t("order_amount_label")}</p>
                  <p className="font-black text-[#22D3A6] mt-0.5">Q{selectedCardDetail.montoTotal.toFixed(2)}</p>
                </div>
              </div>
            </div>

            {/* Item Table details */}
            <div className="space-y-2">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t("items_in_order_title")}</h4>
              <div className="rounded-xl border border-slate-900 bg-slate-900/20 overflow-hidden max-h-[160px] overflow-y-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-900 bg-slate-955/60 text-slate-500 font-bold uppercase text-[9px] tracking-wider">
                      <th className="p-2.5 pl-4">{t("table_product")}</th>
                      <th className="p-2.5 text-center">{t("table_qty")}</th>
                      <th className="p-2.5 text-right pr-4">{t("table_price")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedCardDetail.detalles.map((d, idx) => (
                      <tr key={idx} className="border-b border-slate-900/60 hover:bg-slate-900/35 text-slate-350">
                        <td className="p-2.5 pl-4 font-semibold text-white truncate max-w-[200px]">
                          {d.productoNombre ?? t("item_fallback")}
                        </td>
                        <td className="p-2.5 text-center font-bold text-slate-450">{d.cantidad}</td>
                        <td className="p-2.5 text-right pr-4 text-[#22D3A6] font-bold">
                          Q{d.precioCobrado.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {/* Interactive Actions Selector */}
            <div className="space-y-3 pt-3 border-t border-slate-900">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Acciones del Pedido</h4>
              {selectedCardDetail.estadoPago === "cancelado" || selectedCardDetail.estadoDespacho === "cancelado" ? (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 font-bold text-center text-xs">
                  ⚠️ Este pedido se encuentra CANCELADO y sus existencias han sido reintegradas al inventario.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {getReservationColumn(selectedCardDetail) === "pendiente_pago" && (
                    <button
                      onClick={() => {
                        updateReservationStatus(selectedCardDetail.id, "pagado_procesando");
                        setSelectedCardDetail(null);
                      }}
                      className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#22D3A6] font-bold border border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 size={14} />
                      <span>Verificar Pago</span>
                    </button>
                  )}

                  {(getReservationColumn(selectedCardDetail) === "pendiente_pago" || getReservationColumn(selectedCardDetail) === "pagado_procesando") && (
                    <button
                      onClick={() => {
                        updateReservationStatus(selectedCardDetail.id, "despachado");
                        setSelectedCardDetail(null);
                      }}
                      className="h-10 rounded-xl bg-slate-900 hover:bg-slate-800 text-[#38BDF8] font-bold border border-slate-800 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Truck size={14} />
                      <span>Marcar Despachado</span>
                    </button>
                  )}

                  <button
                    onClick={() => cancelarPedido(selectedCardDetail.id)}
                    className="h-10 rounded-xl bg-rose-500/10 hover:bg-rose-600 text-rose-400 hover:text-white font-bold border border-rose-500/20 transition-all cursor-pointer flex items-center justify-center gap-1.5 col-span-full"
                  >
                    <XCircle size={14} />
                    <span>Cancelar Pedido (Devolver al Stock)</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </PortalModal>
      )}
    </div>
  );
}
