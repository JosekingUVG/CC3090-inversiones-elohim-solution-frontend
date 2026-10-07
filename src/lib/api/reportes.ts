import { apiRequest, buildAuthHeaders } from "@/lib/api/client";

export type TModoReporte = "todos" | "ventas" | "reservaciones";

export type TReportesFiltro = {
  desde?: string;
  hasta?: string;
  modo?: TModoReporte;
};

export type TReporteProductos = {
  totalProductosVendidos: number;
  ingresosTotales: number;
  productoTop: string | null;
  unidadesProductoTop: number | null;
  productos: Array<{
    producto: string;
    cantidadVendida: number;
    ingresos: number;
  }>;
  detalle: Array<{
    posicion: number;
    producto: string;
    cantidadVendida: number;
    ingresos: number;
    precioPromedio: number;
  }>;
};

export type TReporteEmpleados = {
  totalEmpleados: number;
  totalVentas: number;
  montoTotal: number;
  topVendedor: string | null;
  ventasTopVendedor: number | null;
  empleados: Array<{
    empleado: string;
    ventas: number;
    monto: number;
  }>;
  detalle: Array<{
    empleado: string;
    ventasRealizadas: number;
    montoTotal: number;
    promedioPorVenta: number;
    desempeno: string;
  }>;
};

export type TReporteStockCritico = {
  productosEnRiesgo: number;
  unidadesFaltantes: number;
  frecuenciaAlta: number;
  grafico: Array<{
    producto: string;
    stockActual: number;
    stockMinimo: number;
  }>;
  detalle: Array<{
    producto: string;
    stockActual: number;
    stockMinimo: number;
    faltante: number;
    frecuenciaQuiebre: string;
    estado: string;
  }>;
};

export type TReporteDemanda = {
  horaPico: string;
  ventasHoraPico: number;
  promedioPorHora: number;
  grafico: Array<{
    horario: string;
    ventas: number;
    clientes: number;
  }>;
  detalle: Array<{
    horario: string;
    ventas: number;
    clientes: number;
    ratioConversion: number;
    clasificacion: string;
  }>;
};

export type TReporteMetodosPago = {
  resumen: Array<{
    metodo: string;
    transacciones: number;
    monto: number;
  }>;
  distribucion: Array<{
    metodo: string;
    transacciones: number;
    monto: number;
    porcentaje: number;
  }>;
  detalle: Array<{
    metodo: string;
    cantidadTransacciones: number;
    porcentaje: number;
    montoTotal: number;
    montoPromedio: number;
  }>;
};

function buildQuery(filtro?: TReportesFiltro): string {
  if (!filtro?.desde && !filtro?.hasta) {
    return "";
  }

  const params = new URLSearchParams();
  if (filtro.desde) params.set("desde", filtro.desde);
  if (filtro.hasta) params.set("hasta", filtro.hasta);
  if (filtro.modo) params.set("modo", filtro.modo);
  return `?${params.toString()}`;
}

export async function obtenerReporteProductos(
  token: string,
  filtro?: TReportesFiltro
): Promise<TReporteProductos> {
  return apiRequest<TReporteProductos>(
    `/api/v1/reportes/productos${buildQuery(filtro)}`,
    { headers: buildAuthHeaders(token) },
    "No se pudo cargar el reporte de productos"
  );
}

export async function obtenerReporteEmpleados(
  token: string,
  filtro?: TReportesFiltro
): Promise<TReporteEmpleados> {
  return apiRequest<TReporteEmpleados>(
    `/api/v1/reportes/empleados${buildQuery(filtro)}`,
    { headers: buildAuthHeaders(token) },
    "No se pudo cargar el reporte de empleados"
  );
}

export async function obtenerReporteStockCritico(
  token: string
): Promise<TReporteStockCritico> {
  return apiRequest<TReporteStockCritico>(
    "/api/admin/reportes/stock-critico",
    { headers: buildAuthHeaders(token) },
    "No se pudo cargar el reporte de stock crítico"
  );
}

export async function obtenerReporteDemanda(
  token: string,
  filtro?: TReportesFiltro
): Promise<TReporteDemanda> {
  return apiRequest<TReporteDemanda>(
    `/api/admin/reportes/demanda${buildQuery(filtro)}`,
    { headers: buildAuthHeaders(token) },
    "No se pudo cargar el reporte de demanda"
  );
}

export async function obtenerReporteMetodosPago(
  token: string,
  filtro?: TReportesFiltro
): Promise<TReporteMetodosPago> {
  return apiRequest<TReporteMetodosPago>(
    `/api/v1/reportes/metodos-pago${buildQuery(filtro)}`,
    { headers: buildAuthHeaders(token) },
    "No se pudo cargar el reporte de métodos de pago"
  );
}

export type TSqlExecutionResult = {
  rows: Array<Record<string, unknown>>;
};

export async function ejecutarRawReporte(
  token: string,
  querySql: string
): Promise<TSqlExecutionResult> {
  return apiRequest<TSqlExecutionResult>(
    "/api/v1/reportes/ejecutar-raw",
    {
      method: "POST",
      headers: {
        ...buildAuthHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ querySql }),
    },
    "No se pudo ejecutar la consulta SQL"
  );
}
