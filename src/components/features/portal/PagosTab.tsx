"use client";

import { useTranslations } from "next-intl";
import { CreditCard } from "lucide-react";
import { toast } from "sonner";
import { cambiarEstadoReservacion, type ReservacionDto } from "@/lib/api/admin";

interface PagosTabProps {
  token: string;
  reservaciones: ReservacionDto[];
  onRefresh: () => void;
}

export function PagosTab({ token, reservaciones, onRefresh }: PagosTabProps) {
  const t = useTranslations("Pagos");

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

  const paidReservations = reservaciones.filter((r) => r.estadoPago === "pagado");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">{t("title")}</h2>
        <p className="text-xs text-slate-400">{t("subtitle")}</p>
      </div>

      {paidReservations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center space-y-3">
          <CreditCard className="mx-auto text-slate-600" size={40} />
          <p className="text-sm text-slate-400">{t("empty_state")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-900 bg-slate-950/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/60 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="p-4">{t("table_payment_id")}</th>
                  <th className="p-4">{t("table_stripe_intent")}</th>
                  <th className="p-4">{t("table_transaction_date")}</th>
                  <th className="p-4">{t("table_net_amount")}</th>
                  <th className="p-4">{t("table_status")}</th>
                  <th className="p-4">{t("table_dispatch")}</th>
                </tr>
              </thead>
              <tbody>
                {paidReservations.map((res) => (
                  <tr
                    key={res.id}
                    className="border-b border-slate-900/55 hover:bg-slate-950/30 transition-all"
                  >
                    <td className="p-4 font-mono font-bold text-white">
                      {t("payment_prefix", { code: res.id.substring(0, 6).toUpperCase() })}
                    </td>
                    <td className="p-4 text-slate-450">{res.stripeIntentId || t("cash_transfer")}</td>
                    <td className="p-4 text-slate-400">{new Date(res.fechaReserva).toLocaleString()}</td>
                    <td className="p-4 text-[#22D3A6] font-bold">Q{res.montoTotal.toFixed(2)}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 text-[9px] font-black uppercase tracking-wider">
                        {t("verified_badge")}
                      </span>
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
