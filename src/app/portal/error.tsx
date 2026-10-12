"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, LayoutDashboard } from "lucide-react";

export default function PortalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Portal Error:", error);
  }, [error]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#081018] px-4 py-10 text-slate-100 sm:px-6 lg:px-8 flex items-center justify-center font-sans">
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute left-[-120px] top-14 h-72 w-72 rounded-full bg-[#22D3A6]/10 blur-3xl" />
        <div className="absolute right-[-80px] top-24 h-80 w-80 rounded-full bg-rose-500/10 blur-3xl" />
      </div>

      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#0d1624] p-8 shadow-2xl text-center space-y-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
          <AlertTriangle className="h-7 w-7" />
        </div>

        <div className="space-y-2">
          <p className="text-[11px] font-black uppercase tracking-[0.25em] text-[#22D3A6]">Portal de Administración</p>
          <h1 className="text-2xl font-black tracking-tight text-white">Error inesperado</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Se ha producido un error al cargar la vista del portal. Puedes intentar recargar la sesión.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            type="button"
            onClick={() => reset()}
            className="w-full sm:w-auto h-11 px-5 rounded-xl bg-linear-to-r from-[#22D3A6] to-[#38BDF8] text-slate-950 font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all border-none cursor-pointer"
          >
            <RefreshCw size={14} />
            <span>Reintentar</span>
          </button>

          <Link
            href="/portal"
            className="w-full sm:w-auto h-11 px-5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center gap-2 hover:bg-slate-800 hover:text-white transition-all text-center no-underline"
          >
            <LayoutDashboard size={14} />
            <span>Recargar Portal</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
