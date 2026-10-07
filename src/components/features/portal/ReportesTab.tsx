"use client";

import React, { useEffect, useState, useRef, useMemo } from "react";
import { useTranslations } from "next-intl";
import { Download, FileText, Loader2, AlertTriangle, Sliders, Play, Database, BookOpen, Copy, Check, Search, Clock, Sparkles, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { MonacoSqlEditor, type MonacoSqlEditorHandle } from "./MonacoSqlEditor";
import { SqlSchemaHelp } from "./SqlSchemaHelp";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  obtenerReporteProductos,
  obtenerReporteEmpleados,
  obtenerReporteMetodosPago,
  ejecutarRawReporte,
  type TReporteProductos,
  type TReporteEmpleados,
  type TReporteMetodosPago,
} from "@/lib/api/reportes";
import type { TiendaDto } from "@/lib/api/admin";

interface ReportesTabProps {
  token: string;
  activeStore: TiendaDto | null;
}

export function ReportesTab({ token, activeStore }: ReportesTabProps) {
  const t = useTranslations("Reportes");
  const [reportSubTab, setReportSubTab] = useState<"productos" | "empleados" | "pagos" | "personalizado">(
    "productos"
  );
  const [reportProductos, setReportProductos] = useState<TReporteProductos | null>(null);
  const [reportEmpleados, setReportEmpleados] = useState<TReporteEmpleados | null>(null);
  const [reportMetodosPago, setReportMetodosPago] = useState<TReporteMetodosPago | null>(null);
  const [reportesLoading, setReportesLoading] = useState(Boolean(token && activeStore));
  const [reportesError, setReportesError] = useState<string | null>(null);

  // Date filters
  const [reportFiltro, setReportFiltro] = useState<{
    desde: string;
    hasta: string;
    modo: "todos" | "ventas" | "reservaciones";
  }>(() => {
    const hasta = new Date();
    const desde = new Date();
    desde.setDate(desde.getDate() - 30);
    return {
      desde: desde.toISOString().slice(0, 10),
      hasta: hasta.toISOString().slice(0, 10),
      modo: "todos",
    };
  });

  // Custom SQL Console states
  const defaultSqlQuery = 'SELECT id, nombre, stock_actual, stock_minimo FROM public."Producto" WHERE tienda_id = @tenant_id AND stock_actual <= stock_minimo ORDER BY stock_actual ASC;';
  const [customQuery, setCustomQuery] = useState(defaultSqlQuery);
  const [customQueryResult, setCustomQueryResult] = useState<Array<Record<string, unknown>> | null>(null);
  const [customQueryError, setCustomQueryError] = useState<string | null>(null);
  const [customQueryLoading, setCustomQueryLoading] = useState(false);
  const [customQueryStats, setCustomQueryStats] = useState<{
    durationMs: number;
    rowCount: number;
    executedAt: string;
    queryExecuted: string;
  } | null>(null);
  const [resultSearchFilter, setResultSearchFilter] = useState("");
  const [copiedResultJson, setCopiedResultJson] = useState(false);
  const [showSchemaHelp, setShowSchemaHelp] = useState(true);
  const monacoEditorRef = useRef<MonacoSqlEditorHandle>(null);

  const [previousRequest, setPreviousRequest] = useState({ token, activeStore, reportSubTab, reportFiltro });
  if (previousRequest.token !== token || previousRequest.activeStore !== activeStore ||
      previousRequest.reportSubTab !== reportSubTab || previousRequest.reportFiltro !== reportFiltro) {
    setPreviousRequest({ token, activeStore, reportSubTab, reportFiltro });
    setReportesLoading(Boolean(token && activeStore && reportSubTab !== "personalizado"));
    setReportesError(null);
  }

  // Fetch Reports Data
  useEffect(() => {
    if (!token || !activeStore) return;
    if (reportSubTab === "personalizado") return;

    const desdeIso = reportFiltro.desde ? new Date(`${reportFiltro.desde}T00:00:00`).toISOString() : undefined;
    const hastaIso = reportFiltro.hasta ? new Date(`${reportFiltro.hasta}T23:59:59`).toISOString() : undefined;
    const filtro = { desde: desdeIso, hasta: hastaIso, modo: reportFiltro.modo };

    if (reportSubTab === "productos") {
      obtenerReporteProductos(token, filtro)
        .then(setReportProductos)
        .catch((err) =>
          setReportesError(
            err instanceof Error ? err.message : t("err_load_products")
          )
        )
        .finally(() => setReportesLoading(false));
    } else if (reportSubTab === "empleados") {
      obtenerReporteEmpleados(token, filtro)
        .then(setReportEmpleados)
        .catch((err) =>
          setReportesError(
            err instanceof Error ? err.message : t("err_load_employees")
          )
        )
        .finally(() => setReportesLoading(false));
    } else if (reportSubTab === "pagos") {
      obtenerReporteMetodosPago(token, filtro)
        .then(setReportMetodosPago)
        .catch((err) =>
          setReportesError(
            err instanceof Error ? err.message : t("err_load_payment_methods")
          )
        )
        .finally(() => setReportesLoading(false));
    }
  }, [token, activeStore, reportSubTab, reportFiltro]);

  // Execute SQL
  const handleExecuteSql = async () => {
    if (!token) return;
    
    // Always obtain the absolute freshest query directly from the Monaco Editor instance
    const queryToExecute = (monacoEditorRef.current?.getValue() ?? customQuery).trim();
    if (!queryToExecute) {
      toast.error(t("err_empty_query"));
      return;
    }

    setCustomQueryLoading(true);
    setCustomQueryError(null);
    setCustomQueryResult(null);
    setResultSearchFilter("");
    const startTime = performance.now();

    try {
      const result = await ejecutarRawReporte(token, queryToExecute);
      const durationMs = Math.round(performance.now() - startTime);
      setCustomQueryResult(result.rows);
      setCustomQueryStats({
        durationMs,
        rowCount: result.rows.length,
        executedAt: new Date().toLocaleTimeString(),
        queryExecuted: queryToExecute,
      });
      toast.success(t("toast_sql_executed", { rows: result.rows.length, ms: durationMs }));
    } catch (err) {
      setCustomQueryError(err instanceof Error ? err.message : t("err_execute_generic"));
      toast.error(t("toast_execute_error"));
    } finally {
      setCustomQueryLoading(false);
    }
  };

  const tieneDatosReporte = () => {
    if (reportSubTab === "productos" && reportProductos?.detalle && reportProductos.detalle.length > 0)
      return true;
    if (reportSubTab === "empleados" && reportEmpleados?.detalle && reportEmpleados.detalle.length > 0)
      return true;
    if (reportSubTab === "pagos" && reportMetodosPago?.detalle && reportMetodosPago.detalle.length > 0)
      return true;
    if (reportSubTab === "personalizado" && customQueryResult && customQueryResult.length > 0) return true;
    return false;
  };

  const exportarReporte = (format: "csv" | "xlsx") => {
    if (!token) return;

    let data: Record<string, unknown>[] = [];
    let fileNameName = "";

    if (reportSubTab === "productos" && reportProductos) {
      data = reportProductos.detalle.map((row) => ({
        [t("export_col_position")]: row.posicion,
        [t("export_col_product")]: row.producto,
        [t("export_col_qty_sold")]: row.cantidadVendida,
        [t("export_col_revenue")]: row.ingresos,
        [t("export_col_avg_price")]: row.precioPromedio,
      }));
      fileNameName = "ventas_por_producto";
    } else if (reportSubTab === "empleados" && reportEmpleados) {
      data = reportEmpleados.detalle.map((row) => ({
        [t("export_col_employee")]: row.empleado,
        [t("export_col_sales_made")]: row.ventasRealizadas,
        [t("export_col_total_amount")]: row.montoTotal,
        [t("export_col_avg_per_sale")]: row.promedioPorVenta,
        [t("export_col_performance")]: row.desempeno,
      }));
      fileNameName = "desempeno_empleados";
    } else if (reportSubTab === "pagos" && reportMetodosPago) {
      data = reportMetodosPago.detalle.map((row) => ({
        [t("export_col_payment_method")]: row.metodo,
        [t("export_col_transaction_count")]: row.cantidadTransacciones,
        [t("export_col_percentage")]: row.porcentaje,
        [t("export_col_total_amount")]: row.montoTotal,
        [t("export_col_avg_amount")]: row.montoPromedio,
      }));
      fileNameName = "metodos_pago";
    } else if (reportSubTab === "personalizado" && customQueryResult) {
      data = customQueryResult;
      fileNameName = "consulta_personalizada";
    }

    if (data.length === 0) {
      toast.error(t("err_no_data_export"));
      return;
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");
    XLSX.writeFile(
      workbook,
      `reporte_${fileNameName}_${new Date().toISOString().slice(0, 10)}.${format}`,
      { bookType: format === "xlsx" ? "xlsx" : "csv" }
    );
    toast.success(t("toast_report_exported", { format: format.toUpperCase() }));
  };

  const isDark = activeStore?.configuracionVisual ? true : true; // Keep dark portal theme default

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between border-b border-slate-900 pb-5">
        <div>
          <h2 className="text-xl font-black text-white">{t("title")}</h2>
          <p className="text-xs text-slate-400">
            {t("subtitle")}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {reportSubTab !== "personalizado" && (
            <>
              {/* Mode selection */}
              <div className="inline-flex rounded-xl bg-slate-955 p-1 border border-slate-900">
                {(["todos", "ventas", "reservaciones"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setReportFiltro((prev) => ({ ...prev, modo: m }))}
                    className={`rounded-lg px-3 py-1 text-[10px] font-bold uppercase tracking-wider transition-all border-none bg-transparent cursor-pointer ${
                      reportFiltro.modo === m
                        ? "bg-[#22D3A6] text-slate-950 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    {m === "todos" ? t("mode_all") : m === "ventas" ? t("mode_sales") : t("mode_reservations")}
                  </button>
                ))}
              </div>

              {/* Date picker */}
              <div className="flex items-center gap-2 rounded-xl bg-slate-955 p-1 border border-slate-900 text-xs">
                <input
                  type="date"
                  value={reportFiltro.desde}
                  onChange={(e) => setReportFiltro((prev) => ({ ...prev, desde: e.target.value }))}
                  className="bg-transparent border-none text-slate-300 font-mono text-[10px] focus:outline-none p-1 w-28 cursor-pointer"
                />
                <span className="text-slate-600">{t("date_separator")}</span>
                <input
                  type="date"
                  value={reportFiltro.hasta}
                  onChange={(e) => setReportFiltro((prev) => ({ ...prev, hasta: e.target.value }))}
                  className="bg-transparent border-none text-slate-300 font-mono text-[10px] focus:outline-none p-1 w-28 cursor-pointer"
                />
              </div>
            </>
          )}

          {/* Export Buttons */}
          {tieneDatosReporte() && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => exportarReporte("csv")}
                className="h-8 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 shrink-0"
              >
                <Download size={12} />
                <span>{t("export_csv_button")}</span>
              </button>
              <button
                onClick={() => exportarReporte("xlsx")}
                className="h-8 px-3 rounded-lg bg-[#22D3A6] hover:bg-[#1ebda1] text-slate-950 text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer border-none shrink-0"
              >
                <FileText size={12} />
                <span>{t("export_excel_button")}</span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub Tabs Navigation */}
      <div className="flex border-b border-slate-900 gap-6">
        {(["productos", "empleados", "pagos", "personalizado"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => {
              setReportSubTab(tab);
              setReportesError(null);
            }}
            className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative border-none bg-transparent cursor-pointer ${
              reportSubTab === tab ? "text-[#22D3A6] font-extrabold" : "text-slate-400 hover:text-white"
            }`}
          >
            {tab === "productos"
              ? t("tab_productos")
              : tab === "empleados"
              ? t("tab_empleados")
              : tab === "pagos"
              ? t("tab_pagos")
              : t("tab_personalizado")}
            {reportSubTab === tab && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#22D3A6]" />}
          </button>
        ))}
      </div>

      {/* Error Alert */}
      {reportesError && reportSubTab !== "personalizado" && (
        <div className="rounded-xl border border-rose-900 bg-rose-950/20 p-4 text-xs text-rose-400 flex items-center gap-2">
          <AlertTriangle size={16} />
          <span>{reportesError}</span>
        </div>
      )}

      {/* Loading State */}
      {reportesLoading && reportSubTab !== "personalizado" && (
        <div className="h-64 flex items-center justify-center">
          <Loader2 className="animate-spin text-[#22D3A6]" size={32} />
        </div>
      )}

      {/* Content Panel */}
      {!reportesLoading && (
        <div className="space-y-6">
          {/* SUBTAB: PRODUCTOS */}
          {reportSubTab === "productos" && reportProductos && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t("kpi_total_sold")}
                  </span>
                  <span className="text-2xl font-black text-white">
                    {reportProductos.totalProductosVendidos.toLocaleString("es-GT")}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t("kpi_total_revenue")}
                  </span>
                  <span className="text-2xl font-black text-[#22D3A6]">
                    Q{" "}
                    {reportProductos.ingresosTotales.toLocaleString("es-GT", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t("kpi_top_product")}
                  </span>
                  <span className="text-lg font-black text-white truncate">
                    {reportProductos.productoTop ?? "—"}
                  </span>
                  {reportProductos.unidadesProductoTop != null && (
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {t("units_label", { count: reportProductos.unidadesProductoTop })}
                    </span>
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Cantidad Vendida */}
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-6 flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("chart_qty_sold_title")}
                  </h3>
                  <div className="h-64 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reportProductos.productos.map((p) => ({
                          name: p.producto,
                          cantidad: p.cantidadVendida,
                        }))}
                        margin={{ top: 10, right: 10, left: -25, bottom: 20 }}
                      >
                        <CartesianGrid stroke="#0e1827" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#475569"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          angle={-25}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                        <Tooltip
                          cursor={{ fill: "rgba(34, 211, 166, 0.05)" }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-black">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {label}
                                  </p>
                                  <p className="font-semibold text-[#38BDF8] text-xs">
                                    {t("tooltip_quantity", { value: payload[0].value as number })}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="cantidad" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Ingresos por Producto */}
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-6 flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("chart_revenue_title")}
                  </h3>
                  <div className="h-64 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reportProductos.productos.map((p) => ({
                          name: p.producto,
                          ingresos: p.ingresos,
                        }))}
                        margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                      >
                        <CartesianGrid stroke="#0e1827" strokeDasharray="3 3" vertical={false} />
                        <XAxis
                          dataKey="name"
                          stroke="#475569"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          angle={-25}
                          textAnchor="end"
                          height={50}
                        />
                        <YAxis
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `Q${v}`}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(34, 211, 166, 0.05)" }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-black">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {label}
                                  </p>
                                  <p className="font-semibold text-[#22D3A6] text-xs">
                                    {t("tooltip_revenue", {
                                      value: Number(payload[0].value).toLocaleString("es-GT", {
                                        minimumFractionDigits: 2,
                                      }),
                                    })}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="ingresos" fill="#22D3A6" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detail Table */}
              <div className="rounded-xl border border-slate-900 bg-slate-950/40 overflow-hidden">
                <div className="border-b border-slate-900 bg-slate-950/80 px-5 py-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {t("detail_table_title")}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-400 bg-slate-950/10 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-5 py-3 text-center w-16">{t("table_position")}</th>
                        <th className="px-5 py-3">{t("table_product")}</th>
                        <th className="px-5 py-3 text-center">{t("table_qty_sold")}</th>
                        <th className="px-5 py-3 text-right">{t("table_revenue")}</th>
                        <th className="px-5 py-3 text-right">{t("table_avg_price")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {reportProductos.detalle.map((row) => (
                        <tr
                          key={row.posicion}
                          className="hover:bg-slate-900/10 transition-colors text-slate-300"
                        >
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center rounded px-2 py-0.5 text-[10px] font-bold ${
                                row.posicion === 1
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/20"
                                  : row.posicion === 2
                                  ? "bg-slate-400/15 text-slate-300 border border-slate-400/20"
                                  : "bg-slate-800/40 text-slate-400"
                              }`}
                            >
                              #{row.posicion}
                            </span>
                          </td>
                          <td className="px-5 py-3 font-bold text-white">{row.producto}</td>
                          <td className="px-5 py-3 text-center font-mono">{row.cantidadVendida}</td>
                          <td className="px-5 py-3 text-right text-[#22D3A6] font-mono">
                            Q {row.ingresos.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-400 font-mono">
                            Q {row.precioPromedio.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB: EMPLEADOS */}
          {reportSubTab === "empleados" && reportEmpleados && (
            <div className="space-y-6">
              {/* KPIs */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t("kpi_total_employees")}
                  </span>
                  <span className="text-2xl font-black text-white">{reportEmpleados.totalEmpleados}</span>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t("kpi_total_sales")}
                  </span>
                  <span className="text-2xl font-black text-white">{reportEmpleados.totalVentas}</span>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t("kpi_total_amount")}
                  </span>
                  <span className="text-2xl font-black text-[#22D3A6]">
                    Q{" "}
                    {reportEmpleados.montoTotal.toLocaleString("es-GT", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 hover:border-slate-800 transition-all">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    {t("kpi_top_seller")}
                  </span>
                  <span className="text-lg font-black text-white truncate">
                    {reportEmpleados.topVendedor ?? "—"}
                  </span>
                  {reportEmpleados.ventasTopVendedor != null && (
                    <span className="text-[10px] text-slate-400 font-semibold">
                      {t("sales_label", { count: reportEmpleados.ventasTopVendedor })}
                    </span>
                  )}
                </div>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Ventas por Empleado */}
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-6 flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("chart_sales_by_employee_title")}
                  </h3>
                  <div className="h-64 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reportEmpleados.empleados.map((e) => ({ name: e.empleado, ventas: e.ventas }))}
                        layout="vertical"
                        margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid stroke="#0e1827" strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          width={80}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(38, 189, 248, 0.05)" }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-black">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {label}
                                  </p>
                                  <p className="font-semibold text-[#38BDF8] text-xs">
                                    {t("tooltip_sales", { value: payload[0].value as number })}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="ventas" fill="#38BDF8" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monto por Empleado */}
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-6 flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("chart_amount_by_employee_title")}
                  </h3>
                  <div className="h-64 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={reportEmpleados.empleados.map((e) => ({ name: e.empleado, monto: e.monto }))}
                        layout="vertical"
                        margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid stroke="#0e1827" strokeDasharray="3 3" horizontal={false} />
                        <XAxis
                          type="number"
                          stroke="#475569"
                          fontSize={9}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `Q${v}`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          width={80}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(34, 211, 166, 0.05)" }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-black">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {label}
                                  </p>
                                  <p className="font-semibold text-[#22D3A6] text-xs">
                                    {t("tooltip_amount", {
                                      value: Number(payload[0].value).toLocaleString("es-GT", {
                                        minimumFractionDigits: 2,
                                      }),
                                    })}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="monto" fill="#22D3A6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detail Table */}
              <div className="rounded-xl border border-slate-900 bg-slate-950/40 overflow-hidden">
                <div className="border-b border-slate-900 bg-slate-950/80 px-5 py-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {t("detail_productivity_title")}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-400 bg-slate-950/10 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-5 py-3">{t("table_employee")}</th>
                        <th className="px-5 py-3 text-center">{t("table_sales_made")}</th>
                        <th className="px-5 py-3 text-right">{t("table_total_amount")}</th>
                        <th className="px-5 py-3 text-right">{t("table_avg_per_sale")}</th>
                        <th className="px-5 py-3 text-center">{t("table_performance")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {reportEmpleados.detalle.map((row) => (
                        <tr
                          key={row.empleado}
                          className="hover:bg-slate-900/10 transition-colors text-slate-300"
                        >
                          <td className="px-5 py-3 font-bold text-white">{row.empleado}</td>
                          <td className="px-5 py-3 text-center font-mono">{row.ventasRealizadas}</td>
                          <td className="px-5 py-3 text-right text-[#22D3A6] font-mono">
                            Q {row.montoTotal.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-400 font-mono">
                            Q {row.promedioPorVenta.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-center">
                            <span
                              className={`inline-flex items-center justify-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                                row.desempeno === "Excelente"
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : row.desempeno === "Muy Bueno"
                                  ? "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                                  : "bg-slate-800/60 text-slate-300"
                              }`}
                            >
                              {row.desempeno}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB: METODOS DE PAGO */}
          {reportSubTab === "pagos" && reportMetodosPago && (
            <div className="space-y-6">
              {/* KPIs Summary */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {reportMetodosPago.resumen.map((item) => (
                  <div
                    key={item.metodo}
                    className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-1 hover:border-slate-800 transition-all"
                  >
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                      {item.metodo}
                    </span>
                    <span className="text-2xl font-black text-white">{t("transactions_label", { count: item.transacciones })}</span>
                    <span className="text-xs text-[#22D3A6] font-bold">
                      {t("total_label", { value: item.monto.toLocaleString("es-GT", { minimumFractionDigits: 2 }) })}
                    </span>
                  </div>
                ))}
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Distribución por Método */}
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-6 flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("chart_distribution_title")}
                  </h3>
                  <div className="h-64 w-full flex items-center justify-center text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Tooltip
                          content={({ active, payload }) => {
                            if (active && payload && payload.length) {
                              const data = payload[0].payload;
                              return (
                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-black">
                                  <p className="text-[10px] font-bold text-white uppercase tracking-wider">
                                    {data.metodo}
                                  </p>
                                  <p className="font-semibold text-[#38BDF8] text-xs">
                                    {t("tooltip_transactions", { value: data.transacciones })}
                                  </p>
                                  <p className="font-semibold text-[#22D3A6] text-xs">
                                    {t("tooltip_percentage", { value: data.porcentaje })}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Pie
                          data={reportMetodosPago.distribucion}
                          dataKey="transacciones"
                          nameKey="metodo"
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          fill="#38BDF8"
                          label={({ name, porcentaje }) => `${name} (${porcentaje}%)`}
                          labelLine={{ stroke: "#475569", strokeWidth: 1 }}
                        >
                          {reportMetodosPago.distribucion.map((entry, idx) => {
                            const colors = ["#38BDF8", "#22D3A6", "#F59E0B", "#EF4444", "#8B5CF6"];
                            return <Cell key={`cell-${idx}`} fill={colors[idx % colors.length]} />;
                          })}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Monto por Método */}
                <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-6 flex flex-col gap-4">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    {t("chart_amount_by_method_title")}
                  </h3>
                  <div className="h-64 w-full text-xs">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportMetodosPago.distribucion} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                        <CartesianGrid stroke="#0e1827" strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="metodo" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis
                          stroke="#475569"
                          fontSize={10}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `Q${v}`}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(34, 211, 166, 0.05)" }}
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-black">
                                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                    {label}
                                  </p>
                                  <p className="font-semibold text-[#38BDF8] text-xs">
                                    {t("tooltip_total_amount", {
                                      value: Number(payload[0].value).toLocaleString("es-GT", {
                                        minimumFractionDigits: 2,
                                      }),
                                    })}
                                  </p>
                                </div>
                              );
                            }
                            return null;
                          }}
                        />
                        <Bar dataKey="monto" fill="#38BDF8" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Detail Table */}
              <div className="rounded-xl border border-slate-900 bg-slate-950/40 overflow-hidden">
                <div className="border-b border-slate-900 bg-slate-950/80 px-5 py-4">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {t("detail_payment_methods_title")}
                  </h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-900 text-slate-400 bg-slate-950/10 font-bold uppercase tracking-wider text-[10px]">
                        <th className="px-5 py-3">{t("table_method")}</th>
                        <th className="px-5 py-3 text-center">{t("table_transaction_count")}</th>
                        <th className="px-5 py-3 text-center">{t("table_percentage")}</th>
                        <th className="px-5 py-3 text-right">{t("table_total_amount")}</th>
                        <th className="px-5 py-3 text-right">{t("table_avg_amount")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900">
                      {reportMetodosPago.detalle.map((row) => (
                        <tr
                          key={row.metodo}
                          className="hover:bg-slate-900/10 transition-colors text-slate-350"
                        >
                          <td className="px-5 py-3 font-bold text-white">{row.metodo}</td>
                          <td className="px-5 py-3 text-center font-mono">{row.cantidadTransacciones}</td>
                          <td className="px-5 py-3 text-center">
                            <span className="inline-flex items-center justify-center rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 text-[10px] font-bold">
                              {row.porcentaje}%
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right text-[#22D3A6] font-mono">
                            Q {row.montoTotal.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right text-slate-400 font-mono">
                            Q {row.montoPromedio.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB: PERSONALIZADO */}
          {reportSubTab === "personalizado" && (
            <div className="space-y-6">
              {/* Monaco Editor Card */}
              <div className="rounded-xl border border-slate-900 bg-slate-955 p-6 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-900/60 pb-3 gap-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="text-[#22D3A6]" size={18} />
                    <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                      {t("sql_console_title")}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowSchemaHelp((prev) => !prev)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                        showSchemaHelp
                          ? "bg-[#22D3A6]/10 text-[#22D3A6] border-[#22D3A6]/30"
                          : "bg-slate-900 text-slate-400 border-slate-800 hover:text-white"
                      }`}
                    >
                      <BookOpen size={13} />
                      <span>{showSchemaHelp ? t("hide_schema_help") : t("show_schema_help")}</span>
                    </button>
                    <span className="text-[10px] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-2.5 py-0.5 rounded-full font-bold">
                      {t("readonly_badge")}
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <MonacoSqlEditor
                    ref={monacoEditorRef}
                    value={customQuery}
                    onChange={(val) => setCustomQuery(val)}
                    onExecute={handleExecuteSql}
                    onToggleHelp={() => setShowSchemaHelp((prev) => !prev)}
                    isLoading={customQueryLoading}
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    {t("security_note_intro")} <code className="text-[#38BDF8] font-mono">tienda_id</code> {t("security_note_using")}{" "}
                    <code className="text-[#22D3A6] font-mono">@tenant_id</code> {t("security_note_example")}{" "}
                    <code className="text-[#22D3A6] font-mono">WHERE tienda_id = @tenant_id</code>). {t("security_note_readonly")}<code className="text-[#38BDF8] font-mono">SELECT</code> {t("security_note_or")}{" "}
                    <code className="text-[#38BDF8] font-mono">WITH</code>{t("security_note_end")}
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <span className="text-[10px] text-slate-400 font-semibold">
                    {t("privilege_note")}
                  </span>
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                      type="button"
                      onClick={() => {
                        setCustomQuery(defaultSqlQuery);
                        monacoEditorRef.current?.setValue(defaultSqlQuery);
                      }}
                      className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-800 transition-all"
                      title={t("restore_initial_tooltip")}
                    >
                      {t("restore_initial_button")}
                    </button>
                    <button
                      onClick={handleExecuteSql}
                      disabled={customQueryLoading}
                      className="h-9 px-5 rounded-xl bg-[#22D3A6] hover:bg-[#1ebda1] disabled:bg-slate-800 disabled:text-slate-500 text-slate-950 text-xs font-bold cursor-pointer border-none transition-all flex items-center gap-2 shadow-sm"
                    >
                      {customQueryLoading ? (
                        <>
                          <Loader2 className="animate-spin" size={14} />
                          <span>{t("executing_label")}</span>
                        </>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Play size={11} className="fill-slate-950" /> {t("execute_query_button")}
                        </span>
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Schema Helper Component */}
              {showSchemaHelp && (
                <SqlSchemaHelp
                  onInsertSnippet={(snippet) => monacoEditorRef.current?.insertText(snippet)}
                  onSetQuery={(sql) => {
                    setCustomQuery(sql);
                    monacoEditorRef.current?.setValue(sql);
                  }}
                />
              )}

              {/* Custom Query Error */}
              {customQueryError && (
                <div className="rounded-xl border border-rose-900 bg-rose-955 p-5 space-y-2 animate-fade-in">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-rose-400 font-bold text-xs uppercase tracking-wider">
                      <AlertTriangle size={16} />
                      <span>{t("execution_error_title")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCustomQueryError(null)}
                      className="text-xs text-rose-400 hover:text-rose-200 cursor-pointer bg-transparent border-none"
                    >
                      {t("close_error_button")}
                    </button>
                  </div>
                  <p className="text-xs font-mono text-rose-300 bg-rose-950/40 p-3 rounded-lg border border-rose-900/30 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                    {customQueryError}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {t("error_hint")}
                  </p>
                </div>
              )}

              {/* Custom Query Results */}
              {customQueryResult && (
                <div className="rounded-xl border border-slate-900 bg-slate-955/80 overflow-hidden shadow-lg animate-fade-in space-y-0">
                  {/* Results Header with Live Stats & Actions */}
                  <div className="border-b border-slate-900 bg-slate-950/90 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#22D3A6]/10 text-[#22D3A6] border border-[#22D3A6]/20">
                        <Database size={15} />
                      </div>
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span>{t("realtime_result_title")}</span>
                      </h3>

                      {/* Live Badges */}
                      <span className="text-[10px] font-bold text-[#22D3A6] bg-[#22D3A6]/10 px-2.5 py-0.5 rounded-full border border-[#22D3A6]/30 uppercase font-mono">
                        {t("rows_count_badge", { count: customQueryResult.length })}
                      </span>

                      {customQueryStats && (
                        <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-400">
                          <span className="flex items-center gap-1 text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded border border-sky-500/20">
                            <Clock size={11} /> {customQueryStats.durationMs}ms
                          </span>
                          <span className="hidden md:inline text-slate-500">
                            {t("executed_at_label", { time: customQueryStats.executedAt })}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Action buttons & Result Filter */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Search in Result */}
                      {customQueryResult.length > 0 && (
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500" />
                          <input
                            type="text"
                            placeholder={t("filter_results_placeholder")}
                            value={resultSearchFilter}
                            onChange={(e) => setResultSearchFilter(e.target.value)}
                            className="h-8 w-36 sm:w-44 rounded-lg bg-slate-900/90 pl-8 pr-2 text-[11px] text-slate-200 placeholder:text-slate-500 border border-slate-800 focus:border-[#22D3A6] focus:outline-none transition-colors font-mono"
                          />
                          {resultSearchFilter && (
                            <button
                              type="button"
                              onClick={() => setResultSearchFilter("")}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer bg-transparent border-none"
                            >
                              ✕
                            </button>
                          )}
                        </div>
                      )}

                      {/* Copy JSON */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(JSON.stringify(customQueryResult, null, 2));
                          setCopiedResultJson(true);
                          toast.success(t("toast_json_copied"));
                          setTimeout(() => setCopiedResultJson(false), 2000);
                        }}
                        className="h-8 px-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-300 text-[11px] font-mono font-medium border border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title={t("copy_json_tooltip")}
                      >
                        {copiedResultJson ? (
                          <>
                            <Check size={12} className="text-[#22D3A6]" />
                            <span className="text-[#22D3A6]">{t("copied_label")}</span>
                          </>
                        ) : (
                          <>
                            <Copy size={12} />
                            <span>JSON</span>
                          </>
                        )}
                      </button>

                      {/* Export CSV */}
                      <button
                        type="button"
                        onClick={() => {
                          if (!customQueryResult || customQueryResult.length === 0) return;
                          const ws = XLSX.utils.json_to_sheet(customQueryResult);
                          const wb = XLSX.utils.book_new();
                          XLSX.utils.book_append_sheet(wb, ws, "Consulta_SQL");
                          XLSX.writeFile(wb, `consulta_sql_${new Date().toISOString().slice(0, 10)}.csv`, { bookType: "csv" });
                          toast.success(t("toast_csv_exported"));
                        }}
                        className="h-8 px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 text-[11px] font-semibold border border-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
                        title={t("export_csv_result_tooltip")}
                      >
                        <Download size={12} className="text-[#22D3A6]" />
                        <span>{t("export_csv_button")}</span>
                      </button>
                    </div>
                  </div>

                  {customQueryResult.length === 0 ? (
                    <div className="p-12 text-center text-slate-500 font-mono text-xs space-y-1">
                      <p className="text-slate-400 font-semibold">{t("zero_rows_title")}</p>
                      <p className="text-slate-600">{t("zero_rows_desc")}</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto max-h-[460px] sidebar-scrollbar">
                      <table className="w-full text-left border-collapse text-xs font-mono">
                        <thead>
                          <tr className="border-b border-slate-900 text-slate-400 bg-slate-950 font-bold uppercase tracking-wider text-[10px] sticky top-0 z-10 shadow-sm">
                            <th className="px-3.5 py-3 w-12 text-center text-slate-600 bg-slate-950">#</th>
                            {Object.keys(customQueryResult[0]).map((key) => (
                              <th key={key} className="px-4 py-3 whitespace-nowrap bg-slate-950 text-slate-300">
                                {key}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-900/70">
                          {customQueryResult
                            .filter((row) => {
                              if (!resultSearchFilter.trim()) return true;
                              const q = resultSearchFilter.toLowerCase();
                              return Object.values(row).some((val) =>
                                val !== null && val !== undefined && String(val).toLowerCase().includes(q)
                              );
                            })
                            .map((row, idx) => (
                              <tr key={idx} className="hover:bg-slate-900/40 transition-colors text-slate-300 group">
                                <td className="px-3.5 py-2.5 text-center text-[10px] text-slate-600 font-mono select-none group-hover:text-slate-400">
                                  {idx + 1}
                                </td>
                                {Object.keys(customQueryResult[0]).map((key) => {
                                  const cellVal = row[key];
                                  return (
                                    <td key={key} className="px-4 py-2.5 whitespace-nowrap max-w-[320px] truncate">
                                      {cellVal === null || cellVal === undefined ? (
                                        <span className="text-slate-600 font-semibold italic text-[10px] bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800/80">
                                          NULL
                                        </span>
                                      ) : typeof cellVal === "boolean" ? (
                                        <span
                                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                            cellVal
                                              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                              : "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                                          }`}
                                        >
                                          {cellVal ? "true" : "false"}
                                        </span>
                                      ) : typeof cellVal === "number" ? (
                                        <span className="text-[#22D3A6] font-semibold">
                                          {Number.isInteger(cellVal) ? cellVal : cellVal.toLocaleString("es-GT", { minimumFractionDigits: 2 })}
                                        </span>
                                      ) : typeof cellVal === "object" ? (
                                        <span className="text-sky-300 font-mono text-[11px] bg-sky-950/40 px-1.5 py-0.5 rounded border border-sky-900/40">
                                          {JSON.stringify(cellVal)}
                                        </span>
                                      ) : typeof cellVal === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cellVal) ? (
                                        <span
                                          className="text-slate-400 font-mono text-[11px] hover:text-white cursor-pointer select-all"
                                          title={t("uuid_tooltip")}
                                        >
                                          {cellVal}
                                        </span>
                                      ) : (
                                        <span className="text-slate-200">{String(cellVal)}</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
