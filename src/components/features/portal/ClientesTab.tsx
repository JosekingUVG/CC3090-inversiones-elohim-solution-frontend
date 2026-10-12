"use client";

import { useState, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Users, Search, X } from "lucide-react";
import type { PlatformUsuarioDto } from "@/lib/api/admin";
import { TablePagination } from "@/components/ui";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [estadoFiltro, setEstadoFiltro] = useState<EstadoFiltro>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const clientUsuarios = useMemo(() => {
    return usuarios.filter((u) => u.tipoUsuario === "cliente");
  }, [usuarios]);

  const filteredClientUsuarios = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return clientUsuarios.filter((u) => {
      if (estadoFiltro === "active" && !u.estado) return false;
      if (estadoFiltro === "inactive" && u.estado) return false;
      if (!q) return true;
      const nameMatch = u.name.toLowerCase().includes(q);
      const emailMatch = u.email.toLowerCase().includes(q);
      return nameMatch || emailMatch;
    });
  }, [clientUsuarios, searchQuery, estadoFiltro]);

  const totalPages = Math.max(1, Math.ceil(filteredClientUsuarios.length / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const paginatedClientUsuarios = filteredClientUsuarios.slice(pageStart, pageStart + pageSize);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-white">{t("title")}</h2>
          <p className="text-xs text-slate-400">{t("subtitle")}</p>
        </div>
        {clientUsuarios.length > 0 && (
          <div className="relative w-full sm:w-60">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Buscar cliente..."
              className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-800 bg-slate-900/60 text-xs text-slate-200 placeholder:text-slate-500 focus:border-[#22D3A6]/50 focus:outline-none transition-all"
            />
          </div>
        )}
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
      ) : filteredClientUsuarios.length === 0 ? (
        <div className="rounded-xl border border-slate-900 bg-slate-950/20 p-8 text-center text-xs text-slate-500">
          No se encontraron clientes con el criterio de búsqueda.
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
                {paginatedClientUsuarios.map((u) => (
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
          <TablePagination
            currentPage={safePage}
            totalItems={filteredClientUsuarios.length}
            pageSize={pageSize}
            pageSizeOptions={[10, 20, 30]}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
          />
        </div>
      )}
    </div>
  );
}
