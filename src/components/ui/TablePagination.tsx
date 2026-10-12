"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";

export interface TablePaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  className?: string;
}

export function TablePagination({
  currentPage,
  totalItems,
  pageSize,
  pageSizeOptions = [10, 20, 30],
  onPageChange,
  onPageSizeChange,
  className = "",
}: TablePaginationProps) {
  const t = useTranslations("Common");

  if (totalItems <= 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const from = pageStart + 1;
  const to = Math.min(pageStart + pageSize, totalItems);

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-900 bg-slate-950/40 px-4 py-3 text-xs text-slate-400 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span>
          {t("pagination_summary", { from, to, total: totalItems })}
        </span>
        <label className="flex items-center gap-2">
          <span>{t("pagination_page_size")}</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
              onPageChange(1);
            }}
            className="h-8 rounded-lg border border-slate-800 bg-slate-900/60 px-2 text-xs text-slate-100 outline-none focus:border-[#22D3A6]/40 cursor-pointer"
          >
            {pageSizeOptions.map((size) => (
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
          onClick={() => onPageChange(safePage - 1)}
          disabled={safePage <= 1}
          className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-1 cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft size={14} />
          <span>{t("pagination_previous")}</span>
        </button>
        <span className="px-2">
          {t("pagination_page_of", { page: safePage, pages: totalPages })}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(safePage + 1)}
          disabled={safePage >= totalPages}
          className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 transition-all flex items-center gap-1 cursor-pointer border-none disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>{t("pagination_next")}</span>
          <ChevronRight size={14} />
        </button>
      </div>
    </div>
  );
}
