"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, Loader2, Users, X } from "lucide-react";
import type { PlatformUsuarioDto } from "@/lib/api/admin";

const PAGE_SIZE_OPTIONS = [10, 25, 30];

type EstadoFiltro = "all" | "active" | "inactive";

interface ClientesTabProps {
  usuarios: PlatformUsuarioDto[];
  loadingUsuarios: boolean;
  esAdmin: boolean;
  onToggleEstado: (u: PlatformUsuarioDto) => void;
  onOpenChangeRol: (u: PlatformUsuarioDto) => void;
}

export function ClientesTab({
  usuarios,
  loadingUsuarios,
  esAdmin,
  onToggleEstado,
  onOpenChangeRol,
}: ClientesTabProps) {
  const t = useTranslations("Clientes");
  const clientUsuarios = useMemo(() => usuarios.filter((u) => u.tipoUsuario === "cliente"), [usuarios]);

  // Filters
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("all");

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);

  const filteredUsuarios = useMemo(
    () =>
      clientUsuarios.filter((u) => {
        if (estadoFiltro === "active") return u.estado;
        if (estadoFiltro === "inactive") return !u.estado;
        return true;
      }),
    [clientUsuarios, estadoFiltro]
  );

  const totalPages = Math.max(1, Math.ceil(filteredUsuarios.length / pageSize));
  // Se limita la página al rango válido (p. ej. tras suspender al último cliente de la página con un filtro activo)
  const safePage = Math.min(currentPage, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedUsuarios = filteredUsuarios.slice(pageStart, pageStart + pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-black text-white">{t("title")}</h2>
        <p className="text-xs text-slate-400">{t("subtitle")}</p>
      </div>

      {!loadingUsuarios && clientUsuarios.length > 0 && (
        <div className="flex flex-wrap items-end gap-4 rounded-xl border border-slate-900 bg-slate-950/20 p-4 text-xs">
          <label className="space-y-1">
            <span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {t("filter_status")}
            </span>
            <select
              value={estadoFiltro}
              onChange={(e) => {
                setEstadoFiltro(e.target.value as EstadoFiltro);
                setCurrentPage(1);
              }}
              className="h-8 rounded-lg border border-slate-800 bg-slate-900/60 px-2 text-xs text-slate-100 outline-none focus:border-[#22D3A6]/40 cursor-pointer"
            >
              <option value="all">{t("filter_status_all")}</option>
              <option value="active">{t("filter_status_active")}</option>
              <option value="inactive">{t("filter_status_inactive")}</option>
            </select>
          </label>

          {estadoFiltro !== "all" && (
            <button
              type="button"
              onClick={() => {
                setEstadoFiltro("all");
                setCurrentPage(1);
              }}
              className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-all flex items-center gap-1 cursor-pointer border-none"
            >
              <X size={12} />
              <span>{t("filter_clear")}</span>
            </button>
          )}
        </div>
      )}

      {loadingUsuarios ? (
        <div className="h-48 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#22D3A6]" size={32} />
        </div>
      ) : clientUsuarios.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center space-y-3">
          <Users className="mx-auto text-slate-600" size={40} />
          <p className="text-sm text-slate-400">{t("empty_state")}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-slate-900 bg-slate-950/20 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-900 bg-slate-950/60 text-slate-400 uppercase font-bold tracking-wider">
                  <th className="p-4">{t("table_client")}</th>
                  <th className="p-4">{t("table_email")}</th>
                  <th className="p-4">{t("table_status")}</th>
                  {esAdmin && <th className="p-4 text-right">{t("table_actions")}</th>}
                </tr>
              </thead>
              <tbody>
                {filteredUsuarios.length === 0 && (
                  <tr>
                    <td colSpan={esAdmin ? 4 : 3} className="p-8 text-center text-slate-400">
                      {t("no_results")}
                    </td>
                  </tr>
                )}
                {paginatedUsuarios.map((u) => (
                  <tr
                    key={u.id}
                    className="border-b border-slate-900/55 hover:bg-slate-950/30 transition-all"
                  >
                    <td className="p-4 flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-[#38BDF8]">
                        {u.name.substring(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-white">{u.name}</span>
                    </td>
                    <td className="p-4 text-slate-300">{u.email}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider ${
                          u.estado
                            ? "bg-emerald-500/10 text-emerald-400"
                            : "bg-rose-500/10 text-rose-400"
                        }`}
                      >
                        {u.estado ? t("status_active") : t("status_suspended")}
                      </span>
                    </td>
                    {esAdmin && (
                      <td className="p-4 text-right">
                        <button
                          onClick={() => onToggleEstado(u)}
                          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer border-none text-[10px] font-bold"
                        >
                          {u.estado ? t("action_suspend") : t("action_activate")}
                        </button>
                        <button
                          onClick={() => onOpenChangeRol(u)}
                          className="p-1.5 rounded bg-slate-900 hover:bg-slate-800 text-[#38BDF8] cursor-pointer border-none text-[10px] font-bold ml-2"
                        >
                          {t("action_change_role")}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredUsuarios.length > 0 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-900 bg-slate-950/40 px-4 py-3 text-xs text-slate-400">
              <div className="flex items-center gap-3">
                <span>
                  {t("pagination_summary", {
                    from: pageStart + 1,
                    to: pageStart + paginatedUsuarios.length,
                    total: filteredUsuarios.length,
                  })}
                </span>
                <label className="flex items-center gap-2">
                  <span>{t("pagination_page_size")}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => {
                      setPageSize(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="h-8 rounded-lg border border-slate-800 bg-slate-900/60 px-2 text-xs text-slate-100 outline-none focus:border-[#22D3A6]/40 cursor-pointer"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage(safePage - 1)}
                  disabled={safePage <= 1}
                  className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-1 cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ChevronLeft size={14} />
                  <span>{t("pagination_previous")}</span>
                </button>
                <span className="px-2">{t("pagination_page_of", { page: safePage, pages: totalPages })}</span>
                <button
                  type="button"
                  onClick={() => setCurrentPage(safePage + 1)}
                  disabled={safePage >= totalPages}
                  className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-1 cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span>{t("pagination_next")}</span>
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
