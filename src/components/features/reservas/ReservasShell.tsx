"use client";

import { useState, useMemo } from "react";
import { useHistorialCompras } from "@/hooks/useHistorialCompras";
import { CompraReservacionCard } from "./CompraReservacionCard";
import { EstadoVacio, ErrorMessage } from "@/components/ui";

export function ReservasShell() {
  const { reservaciones, isLoading, isError, error } = useHistorialCompras();

  if (isLoading) {
    return (
      <div className="flex! items-center! justify-center! py-12!">
        <div className="h-8! w-8! animate-spin! rounded-full! border-b-2! border-blue-600!" />
        <span className="ml-2! text-gray-600!">Cargando tu historial…</span>
      </div>
    );
  }

  if (isError) {
    return (
      <ErrorMessage
        mensaje={error instanceof Error ? error.message : "No se pudo cargar el historial de compras."}
      />
    );
  }

  if (!reservaciones.length) {
    return (
      <EstadoVacio
        mensaje="Aún no tenés compras registradas"
        descripcion="Cuando completes una reserva o pago, aparecerá aquí el historial."
      />
    );
  }

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;

  const ordenadas = useMemo(() => {
    return [...reservaciones].sort((a, b) => {
      const ta = new Date(a.fechaLimiteRetiro).getTime();
      const tb = new Date(b.fechaLimiteRetiro).getTime();
      return tb - ta;
    });
  }, [reservaciones]);

  const totalPages = Math.max(1, Math.ceil(ordenadas.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const paginated = ordenadas.slice((safePage - 1) * pageSize, safePage * pageSize);

  return (
    <div className="space-y-4!">
      {paginated.map((r) => (
        <CompraReservacionCard key={r.idReservacion} reservacion={r} />
      ))}

      {ordenadas.length > pageSize && (
        <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-sm text-slate-600">
          <span>Página {safePage} de {totalPages}</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(safePage - 1)}
              disabled={safePage <= 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-semibold text-slate-700"
            >
              Anterior
            </button>
            <button
              type="button"
              onClick={() => setCurrentPage(safePage + 1)}
              disabled={safePage >= totalPages}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer text-xs font-semibold text-slate-700"
            >
              Siguiente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
