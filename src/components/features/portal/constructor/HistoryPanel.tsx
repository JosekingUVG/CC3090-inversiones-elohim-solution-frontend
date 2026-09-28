"use client";

import { Clock3, RotateCcw, X } from "lucide-react";
import type { ConfiguracionHistorialDto } from "@/lib/api/admin";

type Props = {
  entries: ConfiguracionHistorialDto[];
  selectedVersion: number | null;
  onPreview: (entry: ConfiguracionHistorialDto) => void;
  onRestore: (version: number) => void;
  onClose: () => void;
  restoring?: boolean;
};

export function HistoryPanel({ entries, selectedVersion, onPreview, onRestore, onClose, restoring = false }: Props) {
  const selected = entries.find((entry) => entry.version === selectedVersion);

  return (
    <aside className="absolute inset-y-0 right-0 z-30 flex w-[360px] flex-col border-l border-slate-800 bg-[#0B1623] shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
        <div>
          <h2 className="text-sm font-black text-white">Historial de versiones</h2>
          <p className="mt-1 text-xs text-slate-400">Previsualiza una versión antes de restaurarla.</p>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Cerrar historial">
          <X size={18} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-3">
        {entries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-700 p-5 text-center text-sm text-slate-400">
            Aún no hay versiones guardadas.
          </p>
        ) : entries.map((entry) => {
          const active = entry.version === selectedVersion;
          return (
            <button
              key={entry.version}
              onClick={() => onPreview(entry)}
              className={`mb-2 w-full rounded-xl border p-4 text-left transition-colors ${active
                ? "border-[#22D3A6] bg-[#22D3A6]/10"
                : "border-slate-800 bg-slate-900/70 hover:border-slate-600"}`}
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-black text-white">Versión {entry.version}</span>
                <Clock3 size={14} className="text-[#22D3A6]" />
              </div>
              <p className="mt-2 text-xs text-slate-400">
                {new Date(entry.timestamp).toLocaleString()}
              </p>
              <p className="mt-1 truncate text-[11px] text-slate-500">{entry.dispositivo}</p>
            </button>
          );
        })}
      </div>

      {selected ? (
        <footer className="border-t border-slate-800 p-4">
          <p className="mb-3 text-xs text-[#22D3A6]">Previsualizando versión {selected.version}. No se han aplicado cambios.</p>
          <button
            onClick={() => onRestore(selected.version)}
            disabled={restoring}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#22D3A6] text-xs font-black text-slate-950 transition hover:brightness-110 disabled:opacity-50"
          >
            <RotateCcw size={15} />
            {restoring ? "Restaurando..." : "Restaurar esta versión"}
          </button>
        </footer>
      ) : null}
    </aside>
  );
}
