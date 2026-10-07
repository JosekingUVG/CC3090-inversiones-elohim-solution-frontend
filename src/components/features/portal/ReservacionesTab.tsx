"use client";

import { useTranslations } from "next-intl";
import { Calendar, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoReservacion, type ReservacionDto } from "@/lib/api/admin";

interface ReservacionesTabProps {
  token: string;
  reservaciones: ReservacionDto[];
  loadingReservaciones: boolean;
  onRefresh: () => void;
}

export function ReservacionesTab({
  token,
  reservaciones,
  loadingReservaciones,
  onRefresh,
}: ReservacionesTabProps) {
  const t = useTranslations("Reservaciones");

  const handleToggleEstadoPagoReservacion = async (res: ReservacionDto) => {
    if (!token) return;
    if (res.estadoPago === "pagado") {
      toast.info("El estado de pago ya está verificado y no puede regresarse.");
      return;
    }
    if (res.estadoPago === "cancelado") {
      toast.info("Este pedido ha sido cancelado.");
      return;
    }
    try {
      await cambiarEstadoReservacion(token, res.id, { estadoPago: "pagado" });
      toast.success(t("toast_payment_updated"));
      onRefresh();
    } catch (err) {
      toast.error((err instanceof Error ? err.message : "") || t("toast_payment_error"));
    }
  };

  const handleToggleDespachoReservacion = async (res: ReservacionDto) => {
    if (!token) return;
    if (res.estadoDespacho === "despachado" || res.estadoDespacho === "entregado") {
      toast.info("El pedido ya se encuentra despachado y no puede regresarse.");
      return;
    }
    if (res.estadoDespacho === "cancelado") {
      toast.info("Este pedido ha sido cancelado.");
      return;
    }
    try {
      await cambiarEstadoReservacion(token, res.id, { estadoDespacho: "despachado" });
      toast.success(t("toast_dispatch_updated"));
      onRefresh();
    } catch (err) {
      toast.error((err instanceof Error ? err.message : "") || t("toast_dispatch_error"));
    }
  };

  const activeReservations = reservaciones.filter((r) => r.estadoPago !== "pagado");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">{t("title")}</h2>
        <p className="text-xs text-slate-400">{t("subtitle")}</p>
      </div>

      {loadingReservaciones ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#22D3A6]" size={32} />
        </div>
      ) : activeReservations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center space-y-3">
          <Calendar className="mx-auto text-slate-600" size={40} />
          <p className="text-sm text-slate-400">{t("empty_state")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-900 bg-slate-950/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/60 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="p-4">{t("table_code")}</th>
                  <th className="p-4">{t("table_date")}</th>
                  <th className="p-4">{t("table_amount")}</th>
                  <th className="p-4">{t("table_payment_status")}</th>
                  <th className="p-4">{t("table_dispatch")}</th>
                  <th className="p-4">{t("table_items_detail")}</th>
                </tr>
              </thead>
              <tbody>
                {activeReservations.map((res) => (
                  <tr
                    key={res.id}
                    className="border-b border-slate-900/55 hover:bg-slate-950/30 transition-all"
                  >
                    <td className="p-4 font-mono font-bold text-white">
                      #{res.id.substring(0, 8).toUpperCase()}
                    </td>
                    <td className="p-4 text-slate-400">
                      {new Date(res.fechaReserva).toLocaleString("es-ES")}
                    </td>
                    <td className="p-4 text-[#22D3A6] font-bold">Q{res.montoTotal.toFixed(2)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleEstadoPagoReservacion(res)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider cursor-pointer border-none ${
                          res.estadoPago === "pagado"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-amber-500/10 text-amber-400"
                        }`}
                      >
                        {res.estadoPago}
                      </button>
                    </td>
                    <td className="p-4">
                      <button
                        onClick={() => handleToggleDespachoReservacion(res)}
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider cursor-pointer border-none ${
                          res.estadoDespacho === "despachado"
                            ? "bg-blue-500/10 text-blue-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {res.estadoDespacho}
                      </button>
                    </td>
                    <td className="p-4 text-slate-300">
                      <div className="flex flex-col gap-0.5 text-[10px]">
                        {res.detalles.map((d, index) => (
                          <span key={index}>
                            • {d.productoNombre ?? t("item_fallback")}: {d.cantidad} ud x Q
                            {d.precioCobrado.toFixed(2)}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
