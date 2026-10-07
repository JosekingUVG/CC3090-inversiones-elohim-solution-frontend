import { apiRequest, buildAuthHeaders } from "@/lib/api/client";
import { TReservacion, TReservacionListado } from "@/types";

export async function crearReservacion(token: string, metodoPagoId: string): Promise<TReservacion> {
  return apiRequest<TReservacion>(
    "/api/reservacion",
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify({ metodoPagoId }),
    },
    "Error al crear la reservación"
  );
}

export async function obtenerReservaciones(token: string): Promise<TReservacionListado[]> {
  return apiRequest<TReservacionListado[]>(
    "/api/v1/reservaciones/mis-compras",
    {
      method: "GET",
      headers: buildAuthHeaders(token),
    },
    "Error al obtener reservaciones"
  );
}


export async function obtenerReservacionPorId(
  token: string,
  idReservacion: string
): Promise<TReservacion> {
  return apiRequest<TReservacion>(
    `/api/reservacion/${idReservacion}`,
    {
      method: "GET",
      headers: buildAuthHeaders(token),
    },
    "Error al obtener la reservación"
  );
}

export type TReservacionV1 = {
  id: string;
  tiendaId: string;
  sucursalId: string;
  usuarioId: string;
  montoTotal: number;
  estadoPago: string;
  estadoDespacho: string;
  stripeIntentId: string | null;
  fechaReserva: string;
  detalles: unknown[];
};

export async function crearReservacionV1(
  token: string,
  payload: { sucursalId: string; stripeIntentId?: string | null }
): Promise<TReservacionV1> {
  return apiRequest<TReservacionV1>(
    "/api/v1/reservaciones",
    {
      method: "POST",
      headers: buildAuthHeaders(token),
      body: JSON.stringify(payload),
    },
    "Error al crear la reservación"
  );
}
