import { apiRequest, buildAuthHeaders } from "@/lib/api/client";

export type UsuarioAdminDto = {
  id: string;
  nombre: string;
  apellido: string | null;
  correo: string;
  telefono: string | null;
  tipoUsuario: string;
  rol: string | null;
  estado: boolean;
  fechaCreacion: string;
};

export async function getAdminUsuarios(
  token: string,
  params?: { busqueda?: string; tipoUsuario?: string; estado?: boolean }
): Promise<UsuarioAdminDto[]> {
  const query = new URLSearchParams();
  if (params?.busqueda) query.set("busqueda", params.busqueda);
  if (params?.tipoUsuario) query.set("tipoUsuario", params.tipoUsuario);
  if (params?.estado !== undefined) query.set("estado", String(params.estado));

  const qs = query.toString();
  return apiRequest<UsuarioAdminDto[]>(
    `/api/admin/usuarios${qs ? `?${qs}` : ""}`,
    { method: "GET", headers: buildAuthHeaders(token) },
    "No se pudo obtener la lista de usuarios"
  );
}

export type CrearUsuarioAdminInput = {
  correo: string;
  nombre: string;
  apellido?: string;
  telefono?: string;
  contrasena: string;
  tipoUsuario: "cliente" | "administrador";
  rol?: "cajero" | "administrador";
  tipoCliente?: "mayorista" | "minorista" | "particular";
  direccion?: string;
};

export async function crearUsuarioAdmin(
  token: string,
  payload: CrearUsuarioAdminInput
): Promise<UsuarioAdminDto> {
  return apiRequest<UsuarioAdminDto>(
    "/api/admin/usuarios",
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo crear el usuario"
  );
}

export type CambiarRolUsuarioInput = {
  rol: "cliente" | "cajero" | "administrador";
  tipoCliente?: "mayorista" | "minorista" | "particular";
  direccion?: string;
};

export async function cambiarRolUsuario(
  token: string,
  id: string,
  payload: CambiarRolUsuarioInput
): Promise<UsuarioAdminDto> {
  return apiRequest<UsuarioAdminDto>(
    `/api/admin/usuarios/${id}/rol`,
    {
      method: "PUT",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo cambiar el rol del usuario"
  );
}

export async function cambiarEstadoUsuario(
  token: string,
  id: string,
  estado: boolean
): Promise<UsuarioAdminDto> {
  return apiRequest<UsuarioAdminDto>(
    `/api/admin/usuarios/${id}/estado`,
    {
      method: "PUT",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ estado }),
    },
    "No se pudo cambiar el estado del usuario"
  );
}

export interface TiendaDto {
  id: string;
  nombre: string;
  slug: string;
  estado: string;
  configuracionVisual: string;
  fechaCreacion: string;
}

export async function getTiendas(token: string): Promise<TiendaDto[]> {
  return apiRequest<TiendaDto[]>(
    "/api/v1/tiendas",
    { method: "GET", headers: buildAuthHeaders(token) },
    "No se pudo obtener la lista de tiendas"
  );
}

export async function getTiendaPorIdOSlug(idOrSlug: string, token?: string): Promise<TiendaDto> {
  return apiRequest<TiendaDto>(
    `/api/v1/tiendas/${idOrSlug}`,
    { method: "GET", headers: buildAuthHeaders(token) },
    "No se pudo obtener la información de la tienda"
  );
}

export async function crearTienda(
  token: string,
  payload: { nombre: string; slug: string }
): Promise<TiendaDto> {
  return apiRequest<TiendaDto>(
    "/api/v1/tiendas",
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo crear la tienda"
  );
}

export async function actualizarTiendaInfo(
  token: string,
  payload: { nombre: string; slug: string }
): Promise<TiendaDto> {
  return apiRequest<TiendaDto>(
    "/api/v1/tiendas/actualizar",
    {
      method: "PUT",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar la información de la tienda"
  );
}

// Sucursales API
export interface SucursalDto {
  id: string;
  tiendaId: string;
  nombre: string;
  direccion: string | null;
  telefono: string | null;
  fechaCreacion: string;
}

export type CrearSucursalInput = {
  nombre: string;
  direccion?: string;
  telefono?: string;
};

export type ActualizarSucursalInput = {
  nombre: string;
  direccion?: string;
  telefono?: string;
};

export async function getSucursales(token: string): Promise<SucursalDto[]> {
  return apiRequest<SucursalDto[]>(
    "/api/v1/sucursales",
    { method: "GET", headers: buildAuthHeaders(token) },
    "No se pudo obtener la lista de sucursales"
  );
}

export async function crearSucursal(
  token: string,
  payload: CrearSucursalInput
): Promise<SucursalDto> {
  return apiRequest<SucursalDto>(
    "/api/v1/sucursales",
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo crear la sucursal"
  );
}

export async function actualizarSucursal(
  token: string,
  id: string,
  payload: ActualizarSucursalInput
): Promise<SucursalDto> {
  return apiRequest<SucursalDto>(
    `/api/v1/sucursales/${id}`,
    {
      method: "PUT",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar la sucursal"
  );
}

export async function eliminarSucursal(
  token: string,
  id: string
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/sucursales/${id}`,
    {
      method: "DELETE",
      headers: buildAuthHeaders(token),
    },
    "No se pudo eliminar la sucursal"
  );
}

// PlatformUsuario API
export interface PlatformUsuarioDto {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  tipoUsuario: string;
  rolStaff: string | null;
  estado: boolean;
  createdAt: string;
  sucursalId: string | null;
  sucursalNombre: string | null;
}

export type InvitarPlatformUsuarioInput = {
  email: string;
  name: string;
  tipoUsuario: string;
  rolStaff?: string;
  contrasena?: string;
  sucursalId?: string | null;
};

export type CambiarRolPlatformUsuarioInput = {
  tipoUsuario: string;
  rolStaff?: string;
  sucursalId?: string | null;
};

export async function getPlatformUsuarios(token: string): Promise<PlatformUsuarioDto[]> {
  return apiRequest<PlatformUsuarioDto[]>(
    "/api/v1/usuarios",
    { method: "GET", headers: buildAuthHeaders(token) },
    "No se pudo obtener la lista de usuarios de la plataforma"
  );
}

export async function invitarPlatformUsuario(
  token: string,
  payload: InvitarPlatformUsuarioInput
): Promise<PlatformUsuarioDto> {
  return apiRequest<PlatformUsuarioDto>(
    "/api/v1/usuarios/invitar",
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo invitar al usuario"
  );
}

export async function cambiarRolPlatformUsuario(
  token: string,
  id: string,
  payload: CambiarRolPlatformUsuarioInput
): Promise<PlatformUsuarioDto> {
  return apiRequest<PlatformUsuarioDto>(
    `/api/v1/usuarios/${id}/rol`,
    {
      method: "PUT",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar el rol del usuario"
  );
}

export async function cambiarEstadoPlatformUsuario(
  token: string,
  id: string,
  activo: boolean
): Promise<PlatformUsuarioDto> {
  return apiRequest<PlatformUsuarioDto>(
    `/api/v1/usuarios/${id}/estado`,
    {
      method: "PUT",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(activo),
    },
    "No se pudo actualizar el estado del usuario"
  );
}

export async function eliminarPlatformUsuario(
  token: string,
  id: string
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/usuarios/${id}`,
    {
      method: "DELETE",
      headers: buildAuthHeaders(token),
    },
    "No se pudo eliminar el usuario"
  );
}

export interface InventarioDto {
  id: string;
  tiendaId: string;
  sucursalId: string;
  productoId: string;
  stock: number;
  productoNombre?: string | null;
  sucursalNombre?: string | null;
}

// Platform Productos v1 API
export interface PlatformProductoDto {
  id: string;
  tiendaId: string;
  categoriaId: string | null;
  nombre: string;
  descripcion: string | null;
  sku: string | null;
  precioMayoreo: number;
  precioDetalle: number;
  imagenUrl: string | null;
  publicado: boolean;
  stockMinimo: number;
  fechaCreacion: string;
  stockTotal: number;
  inventarios: InventarioDto[];
}

export type CrearPlatformProductoInput = {
  nombre: string;
  precioMayoreo: number;
  precioDetalle: number;
  categoriaId?: string | null;
  sku?: string | null;
  descripcion?: string | null;
  imagenUrl?: string | null;
  publicado?: boolean;
  stockMinimo?: number;
  stockSucursales?: { sucursalId: string; stock: number }[];
};

export type ActualizarPlatformProductoInput = {
  nombre: string;
  precioMayoreo: number;
  precioDetalle: number;
  categoriaId?: string | null;
  sku?: string | null;
  descripcion?: string | null;
  imagenUrl?: string | null;
  publicado?: boolean;
  stockMinimo?: number;
  stockSucursales?: { sucursalId: string; stock: number }[];
};

export async function getPlatformProductos(token: string): Promise<PlatformProductoDto[]> {
  return apiRequest<PlatformProductoDto[]>(
    "/api/v1/productos",
    { method: "GET", headers: buildAuthHeaders(token) },
    "No se pudo obtener la lista de productos de la plataforma"
  );
}

export async function crearPlatformProducto(
  token: string,
  payload: CrearPlatformProductoInput
): Promise<PlatformProductoDto> {
  return apiRequest<PlatformProductoDto>(
    "/api/v1/productos",
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo crear el producto"
  );
}

export type CrearPlatformProductoBulkInput = {
  nombre: string;
  precioMayoreo: number;
  precioDetalle: number;
  categoriaId?: string | null;
  sku?: string | null;
  descripcion?: string | null;
  imagenUrl?: string | null;
  publicado?: boolean;
  stockMinimo?: number;
  stockActual?: number;
};

export async function crearPlatformProductosBulk(
  token: string,
  payload: CrearPlatformProductoBulkInput[]
): Promise<PlatformProductoDto[]> {
  return apiRequest<PlatformProductoDto[]>(
    "/api/v1/productos/bulk",
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo realizar la carga masiva de productos"
  );
}

export async function actualizarPlatformProducto(
  token: string,
  id: string,
  payload: ActualizarPlatformProductoInput
): Promise<PlatformProductoDto> {
  return apiRequest<PlatformProductoDto>(
    `/api/v1/productos/${id}`,
    {
      method: "PUT",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar el producto"
  );
}

export async function eliminarPlatformProducto(
  token: string,
  id: string
): Promise<void> {
  return apiRequest<void>(
    `/api/v1/productos/${id}`,
    {
      method: "DELETE",
      headers: buildAuthHeaders(token),
    },
    "No se pudo eliminar el producto"
  );
}

// Platform Reservaciones v1 API
export interface DetalleReservacionDto {
  id: string;
  reservacionId: string;
  productoId: string;
  cantidad: number;
  precioCobrado: number;
  subtotal: number;
  productoNombre: string | null;
}

export interface ReservacionDto {
  id: string;
  tiendaId: string;
  sucursalId: string;
  usuarioId: string;
  montoTotal: number;
  estadoPago: string;
  estadoDespacho: string;
  stripeIntentId: string | null;
  fechaReserva: string;
  detalles: DetalleReservacionDto[];
}

export async function getPlatformReservaciones(token: string): Promise<ReservacionDto[]> {
  return apiRequest<ReservacionDto[]>(
    "/api/v1/reservaciones/control-staff",
    { method: "GET", headers: buildAuthHeaders(token) },
    "No se pudo obtener la lista de reservaciones"
  );
}

export async function cambiarEstadoReservacion(
  token: string,
  id: string,
  payload: { estadoPago?: string; estadoDespacho?: string }
): Promise<ReservacionDto> {
  return apiRequest<ReservacionDto>(
    `/api/v1/reservaciones/${id}/estado`,
    {
      method: "PATCH",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo actualizar el estado de la reservación"
  );
}

export interface CredencialesIntegracionDtoFull {
  tiendaId: string;
  stripeSecretKey: string | null;
  stripePublicKey: string | null;
  cloudinaryCloudName: string | null;
  cloudinaryApiKey: string | null;
  cloudinaryApiSecret: string | null;
  smtpEmail: string | null;
  smtpPassword: string | null;
}

export type GuardarIntegracionesInput = {
  stripeSecretKey: string | null;
  stripePublicKey: string | null;
  cloudinaryCloudName: string | null;
  cloudinaryApiKey: string | null;
  cloudinaryApiSecret: string | null;
  smtpEmail: string | null;
  smtpPassword: string | null;
};

export async function getIntegraciones(token: string): Promise<CredencialesIntegracionDtoFull> {
  return apiRequest<CredencialesIntegracionDtoFull>(
    "/api/v1/tiendas/integraciones",
    { method: "GET", headers: buildAuthHeaders(token) },
    "No se pudo obtener la configuración de integraciones"
  );
}

export async function guardarIntegraciones(
  token: string,
  payload: GuardarIntegracionesInput
): Promise<void> {
  return apiRequest<void>(
    "/api/v1/tiendas/integraciones",
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "No se pudo guardar la configuración de integraciones"
  );
}

export async function actualizarConfiguracionVisual(
  token: string,
  configuracionVisual: Record<string, unknown>
): Promise<TiendaDto> {
  return apiRequest<TiendaDto>(
    "/api/v1/tiendas/configuracion-visual",
    {
      method: "PUT",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ configuracionVisual }),
    },
    "No se pudo guardar la configuración visual de la tienda"
  );
}

export type ConfiguracionHistorialDto = {
  version: number;
  timestamp: string;
  usuarioId: string;
  dispositivo: string;
  config: import("@/types/store-builder").StoreConfig;
};

export type HistorialConfiguracionResponse = {
  history: ConfiguracionHistorialDto[];
  maxVersion: number;
};

export async function guardarConfiguracionDraft(
  token: string,
  configuracion: Record<string, unknown>,
  dispositivo: string,
) {
  return apiRequest(
    "/api/v1/tiendas/configuracion/draft",
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ configuracion, dispositivo }),
    },
    "No se pudo guardar el borrador de la configuración",
  );
}

export async function getConfiguracionHistorial(
  token: string,
  limit = 50,
  offset = 0,
): Promise<HistorialConfiguracionResponse> {
  return apiRequest<HistorialConfiguracionResponse>(
    `/api/v1/tiendas/configuracion/historial?limit=${limit}&offset=${offset}`,
    { method: "GET", headers: buildAuthHeaders(token) },
    "No se pudo obtener el historial de configuración",
  );
}

export async function restaurarConfiguracion(
  token: string,
  version: number,
): Promise<TiendaDto> {
  return apiRequest<TiendaDto>(
    `/api/v1/tiendas/configuracion/restore/${version}`,
    { method: "POST", headers: buildAuthHeaders(token) },
    "No se pudo restaurar la versión seleccionada",
  );
}
