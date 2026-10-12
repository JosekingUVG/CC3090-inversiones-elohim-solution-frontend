"use client";

import Link from "next/link";
import type { TReservacionListado } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Calendar, ChevronRight, Download, Wallet } from "lucide-react";
import { Card } from "@/components/ui/card";
import { generateAndDownloadReceipt } from "@/lib/utils/pdfReceipt";

type CompraReservacionCardProps = {
  reservacion: TReservacionListado;
};

function badgeClassPorEstado(estado: string): string {
  const e = estado.toLowerCase();
  if (e.includes("cancel")) return "bg-red-100 text-red-800";
  if (e.includes("confirm") || e === "completada") return "bg-green-100 text-green-800";
  return "bg-amber-100 text-amber-900";
}

export function CompraReservacionCard({ reservacion }: CompraReservacionCardProps) {
  const fechaRetiro = new Date(reservacion.fechaLimiteRetiro);

  return (
    <Card className="p-5! transition-shadow! hover:shadow-md!">
      <div className="flex! flex-col! gap-4! sm:flex-row! sm:items-start! sm:justify-between!">
        <div className="space-y-2!">
          <div className="flex! flex-wrap! items-center! gap-2!">
            <h3 className="text-lg! font-semibold! text-gray-900!">{reservacion.codigoReservacion}</h3>
            <Badge className={badgeClassPorEstado(reservacion.estado)}>{reservacion.estado}</Badge>
            {reservacion.pagado ? (
              <Badge className="bg-emerald-50! text-emerald-800!">Pagado</Badge>
            ) : (
              <Badge className="border! border-slate-300! bg-white! text-slate-700!">Pendiente de pago</Badge>
            )}
          </div>
          <div className="flex! flex-wrap! gap-4! text-sm! text-gray-600!">
            <span className="inline-flex! items-center! gap-1.5!">
              <Calendar className="h-4! w-4!" />
              Retiro hasta{" "}
              {fechaRetiro.toLocaleDateString("es-GT", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
            <span className="inline-flex! items-center! gap-1.5! font-medium! text-gray-900!">
              <Wallet className="h-4! w-4! text-gray-500!" />
              Q{reservacion.totalReservacion.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="flex! items-center! gap-2!">
          <button
            type="button"
            onClick={() => {
              generateAndDownloadReceipt({
                storeName: "Elohim Shop",
                orderId: reservacion.codigoReservacion,
                date: new Date().toLocaleDateString("es-GT"),
                branchName: "Sucursal",
                paymentMethod: reservacion.pagado ? "tarjeta" : "contra_entrega",
                items: [
                  {
                    nombre: `Reservación ${reservacion.codigoReservacion}`,
                    cantidad: 1,
                    precioUnitario: reservacion.totalReservacion,
                    subtotal: reservacion.totalReservacion,
                  },
                ],
                totalAmount: reservacion.totalReservacion,
              });
            }}
            className="inline-flex! shrink-0! items-center! justify-center! gap-1! rounded-lg! border! border-slate-200! bg-white! px-3! py-2.5! text-sm! font-semibold! text-slate-700! transition-colors! hover:bg-slate-50!"
            title="Descargar Recibo en PDF"
          >
            <Download className="h-4! w-4! text-slate-600!" />
            Recibo
          </button>
          <Link
            href={`/carrito/confirmado/${reservacion.idReservacion}`}
            className="inline-flex! shrink-0! items-center! justify-center! gap-1! rounded-lg! border! border-slate-200! bg-white! px-4! py-2.5! text-sm! font-semibold! text-blue-700! transition-colors! hover:bg-blue-50!"
          >
            Ver detalle
            <ChevronRight className="h-4! w-4!" />
          </Link>
        </div>
      </div>
    </Card>
  );
}
