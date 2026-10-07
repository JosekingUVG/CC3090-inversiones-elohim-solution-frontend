"use client";

import { useTranslations } from "next-intl";
import { ShoppingCart, DollarSign, Package, AlertTriangle } from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";
import type { PlatformProductoDto, PlatformUsuarioDto, ReservacionDto } from "@/lib/api/admin";

interface DashboardTabProps {
  productos: PlatformProductoDto[];
  usuarios: PlatformUsuarioDto[];
  reservaciones: ReservacionDto[];
  usuario: import("@/stores/useAuthStore").TUsuario;
  esAdmin: boolean;
  esStaff: boolean;
}

export function DashboardTab({
  productos,
  usuarios,
  reservaciones,
  usuario,
  esAdmin,
  esStaff,
}: DashboardTabProps) {
  const t = useTranslations("Dashboard");
  // Hoy / Ayer starts
  const hoyStart = new Date();
  hoyStart.setHours(0, 0, 0, 0);

  const hoyEnd = new Date();
  hoyEnd.setHours(23, 59, 59, 999);

  const ayerStart = new Date(hoyStart);
  ayerStart.setDate(ayerStart.getDate() - 1);

  const hoyStr = new Date().toDateString();

  // Metrics
  const totalVentas = reservaciones
    .filter((r) => r.estadoPago === "pagado")
    .reduce((acc, r) => acc + Number(r.montoTotal), 0);

  const ventasHoyCount = reservaciones.filter(
    (r) => new Date(r.fechaReserva).toDateString() === hoyStr
  ).length;

  const ventasAyerCount = reservaciones.filter((r) => {
    const d = new Date(r.fechaReserva);
    return d >= ayerStart && d < hoyStart;
  }).length;

  const displayVentasHoy = t("orders_count", { count: ventasHoyCount });
  let displayVentasHoyChange = t("no_change");
  if (ventasAyerCount > 0) {
    const diff = ((ventasHoyCount - ventasAyerCount) / ventasAyerCount) * 100;
    displayVentasHoyChange = t("pct_vs_yesterday", {
      value: `${diff >= 0 ? "+" : ""}${diff.toFixed(0)}`,
    });
  } else if (ventasHoyCount > 0) {
    displayVentasHoyChange = t("pct_vs_yesterday", { value: "+100" });
  }

  const displayIngresos = `Q ${totalVentas.toLocaleString("es-GT", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

  const ingresosAyer = reservaciones
    .filter((r) => {
      const d = new Date(r.fechaReserva);
      return d >= ayerStart && d < hoyStart && r.estadoPago === "pagado";
    })
    .reduce((acc, r) => acc + Number(r.montoTotal), 0);

  const ingresosHoy = reservaciones
    .filter((r) => {
      const d = new Date(r.fechaReserva);
      return d >= hoyStart && r.estadoPago === "pagado";
    })
    .reduce((acc, r) => acc + Number(r.montoTotal), 0);

  let displayIngresosChange = t("no_revenue_today");
  if (ingresosAyer > 0) {
    const diff = ((ingresosHoy - ingresosAyer) / ingresosAyer) * 100;
    displayIngresosChange = t("pct_vs_yesterday", {
      value: `${diff >= 0 ? "+" : ""}${diff.toFixed(0)}`,
    });
  } else if (ingresosHoy > 0) {
    displayIngresosChange = t("pct_vs_yesterday", { value: "+100" });
  }

  const displayProductosActivos = productos.filter((p) => p.publicado).length;
  const criticalProducts = productos.filter((p) => p.stockTotal <= p.stockMinimo);
  const displayStockCritico = criticalProducts.length;

  // Chart data 1: Ventas por Hora
  const hourCounts = new Array(10).fill(0); // 8:00 to 17:00
  reservaciones.forEach((r) => {
    const date = new Date(r.fechaReserva);
    const hour = date.getHours();
    if (hour >= 8 && hour <= 17) {
      hourCounts[hour - 8]++;
    }
  });
  const chartDataVentasHora = hourCounts.map((count, index) => ({
    name: `${(index + 8).toString().padStart(2, "0")}:00`,
    ventas: count,
  }));

  // Chart data 2: Productos Más Vendidos (Top 5)
  const productSalesMap: Record<string, { name: string; quantity: number }> = {};
  reservaciones.forEach((r) => {
    r.detalles.forEach((d) => {
      if (d.productoNombre) {
        if (!productSalesMap[d.productoNombre]) {
          productSalesMap[d.productoNombre] = { name: d.productoNombre, quantity: 0 };
        }
        productSalesMap[d.productoNombre].quantity += d.cantidad;
      }
    });
  });
  const chartDataTop5 = Object.values(productSalesMap)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)
    .map((p) => ({ name: p.name, ventas: p.quantity }));

  // List 1: Alertas de Stock Crítico
  const displayedCriticalProducts = criticalProducts.map((p) => ({
    nombre: p.nombre,
    minimo: p.stockMinimo,
    disponibles: p.stockTotal,
  }));

  // Helper to fetch user name
  const getUsuarioNombre = (usrId: string) => {
    const found = usuarios.find((u) => u.id === usrId);
    return found ? found.name : t("unknown_user");
  };

  // List 2: Últimas Ventas
  const latestSales = [...reservaciones].sort(
    (a, b) => new Date(b.fechaReserva).getTime() - new Date(a.fechaReserva).getTime()
  );
  const displayedSales = latestSales.slice(0, 4).map((res) => ({
    codigo: `V-${res.id.substring(0, 6).toUpperCase()}`,
    cliente: getUsuarioNombre(res.usuarioId),
    hora: new Date(res.fechaReserva).toLocaleTimeString("es-ES", {
      hour: "2-digit",
      minute: "2-digit",
    }),
    monto: `Q ${res.montoTotal.toFixed(2)}`,
    metodo: res.stripeIntentId ? t("payment_card") : t("payment_cash"),
  }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-white">{t("title")}</h2>
        <p className="text-xs text-slate-400">{t("subtitle")}</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Ventas del Día */}
        <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-slate-800 transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{t("card_sales_today")}</span>
            <ShoppingCart size={14} className="text-[#38BDF8]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{displayVentasHoy}</span>
          </div>
          <div
            className={`text-[10px] font-bold flex items-center gap-1 ${
              ventasHoyCount > 0 ? "text-[#22D3A6]" : "text-slate-400"
            }`}
          >
            <span>{displayVentasHoyChange}</span>
          </div>
        </div>

        {/* Card 2: Ingresos Totales */}
        <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-slate-800 transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{t("card_total_revenue")}</span>
            <DollarSign size={14} className="text-[#22D3A6]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-black text-white">{displayIngresos}</span>
          </div>
          <div
            className={`text-[10px] font-bold flex items-center gap-1 ${
              totalVentas > 0 ? "text-[#22D3A6]" : "text-slate-400"
            }`}
          >
            <span>{displayIngresosChange}</span>
          </div>
        </div>

        {/* Card 3: Productos Activos */}
        <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-slate-800 transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{t("card_active_products")}</span>
            <Package size={14} className="text-[#38BDF8]" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">{displayProductosActivos}</span>
          </div>
          <div className="text-[10px] font-bold text-slate-500 flex items-center gap-1">
            <span>{t("in_inventory")}</span>
          </div>
        </div>

        {/* Card 4: Stock Crítico */}
        <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-slate-800 transition-all">
          <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            <span>{t("card_critical_stock")}</span>
            <AlertTriangle size={14} className="text-amber-500 animate-pulse" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-500">{displayStockCritico}</span>
          </div>
          <div className="text-[10px] font-bold text-amber-500/80 flex items-center gap-1">
            <span>{t("requires_attention")}</span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Ventas por Hora */}
        <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-6 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("chart_sales_by_hour")}</h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDataVentasHora} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="#0e1827" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" stroke="#475569" fontSize={9} tickLine={false} axisLine={false} dy={10} />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip
                  cursor={{ stroke: "rgba(14, 24, 39, 0.4)", strokeWidth: 1 }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-black space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none">
                            {label}
                          </p>
                          <p className="font-semibold text-[#38BDF8] text-xs leading-none">
                            {t("tooltip_sales", { value: payload[0].value as number })}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="ventas"
                  stroke="#38BDF8"
                  strokeWidth={2.5}
                  dot={{ fill: "#38BDF8", stroke: "#081018", strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Productos Más Vendidos (Top 5) */}
        <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-6 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            {t("chart_top_products")}
          </h3>
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDataTop5} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid stroke="#0e1827" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#475569"
                  fontSize={9}
                  tickLine={false}
                  axisLine={false}
                  dy={10}
                  interval={0}
                  tickFormatter={(val) => (val.length > 12 ? `${val.substring(0, 10)}...` : val)}
                />
                <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} dx={-10} />
                <Tooltip
                  cursor={{ fill: "rgba(14, 24, 39, 0.4)" }}
                  content={({ active, payload, label }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-xl border border-slate-800 bg-slate-950 p-3 shadow-2xl shadow-black space-y-1">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider leading-none text-ellipsis overflow-hidden max-w-xs">
                            {label}
                          </p>
                          <p className="font-semibold text-[#22D3A6] text-xs leading-none">
                            {t("tooltip_sales_units", { value: payload[0].value as number })}
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar dataKey="ventas" fill="#38BDF8" radius={[4, 4, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Lists Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Alertas de Stock Crítico */}
        <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-6 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              {t("critical_stock_alerts")}
            </h3>
            <span className="px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-[10px] font-bold">
              {t("products_count_badge", { count: displayedCriticalProducts.length })}
            </span>
          </div>
          <div className="space-y-3">
            {displayedCriticalProducts.map((p, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 transition-all hover:bg-amber-500/10"
              >
                <div>
                  <h4 className="text-xs font-bold text-white">{p.nombre}</h4>
                  <span className="text-[10px] text-slate-400">{t("min_stock", { minimo: p.minimo })}</span>
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-amber-500">{p.disponibles}</span>
                  <p className="text-[9px] text-slate-400">{t("available")}</p>
                </div>
              </div>
            ))}
            {displayedCriticalProducts.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-8">
                {t("no_critical_stock")}
              </p>
            )}
          </div>
        </div>

        {/* Últimas Ventas */}
        <div className="rounded-xl border border-slate-900 bg-slate-955/40 p-6 flex flex-col gap-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">{t("latest_sales")}</h3>
          <div className="space-y-3">
            {displayedSales.map((sale, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-4 rounded-xl border border-slate-900 bg-slate-955/20 hover:border-slate-800 transition-all"
              >
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-white">{sale.codigo}</h4>
                  <p className="text-[10px] text-slate-400">{sale.cliente}</p>
                  <span className="text-[9px] text-slate-500 block">{sale.hora}</span>
                </div>
                <div className="text-right space-y-1.5">
                  <span className="text-xs font-black text-white">{sale.monto}</span>
                  <div>
                    <span className="px-1.5 py-0.5 rounded text-[8px] font-bold bg-slate-900 text-[#22D3A6] border border-slate-800 uppercase tracking-wider">
                      {sale.metodo}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {displayedSales.length === 0 && (
              <p className="text-xs text-slate-500 italic text-center py-8">
                {t("no_recent_sales")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
