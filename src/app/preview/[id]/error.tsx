"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AlertTriangle, ArrowLeft, RefreshCw, Store } from "lucide-react";

export default function PreviewStoreErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const params = useParams();
  const storeId = (params?.id as string) || "";

  useEffect(() => {
    console.error("Preview Storefront Error:", error);
  }, [error]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#fafafa] px-4 py-10 text-slate-900 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-120px] top-14 h-72 w-72 rounded-full bg-rose-500/10 blur-3xl" />
        <div className="absolute right-[-80px] top-24 h-80 w-80 rounded-full bg-slate-200/70 blur-3xl" />
      </div>

      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100/50 text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 shadow-sm border border-rose-100">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-rose-600">Error en Tienda</p>
          <h1 className="text-2xl font-black tracking-tight text-slate-950">No pudimos cargar esta sección</h1>
          <p className="text-xs text-slate-500 leading-relaxed">
            Ocurrió un problema inesperado al procesar la información de este producto o tienda.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            onClick={() => reset()}
            className="w-full sm:w-auto h-11 px-5 rounded-xl bg-slate-950 text-white font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 transition-colors border-none cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Reintentar</span>
          </button>

          {storeId && (
            <Link
              href={`/preview/${storeId}`}
              className="w-full sm:w-auto h-11 px-5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors border-none text-center"
            >
              <Store size={14} />
              <span>Volver a la tienda</span>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
