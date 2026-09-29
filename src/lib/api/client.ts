export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const rawPublicApiUrl = process.env.NEXT_PUBLIC_API_URL;
const rawBackendApiUrl = process.env.BACKEND_API_URL;

const serverApiUrl = (rawBackendApiUrl ?? rawPublicApiUrl)?.replace(/\/+$/, "");

if (typeof window === "undefined" && !serverApiUrl) {
  throw new Error("NEXT_PUBLIC_API_URL no está configurada");
}

export const API_URL = typeof window === "undefined" ? serverApiUrl ?? "" : "";

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== "object") {
    return fallback;
  }

  const maybePayload = payload as {
    error?: unknown;
    message?: unknown;
  };

  if (typeof maybePayload.error === "string") {
    return maybePayload.error;
  }

  if (typeof maybePayload.message === "string") {
    return maybePayload.message;
  }

  return fallback;
}

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
  fallbackErrorMessage = "No se pudo completar la solicitud"
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    cache: "no-store",
    ...init,
  });

  const payload = await response
    .json()
    .catch(() => null) as unknown;

  if (!response.ok) {
    const message = getErrorMessage(payload, fallbackErrorMessage);
    throw new ApiError(message, response.status, payload);
  }

  return payload as T;
}

function getSubdomain(): string | null {
  if (typeof window === "undefined") return null;

  const hostname = window.location.hostname;

  // localhost
  if (hostname.endsWith(".localhost")) {
    const parts = hostname.split(".localhost");
    if (parts.length > 1 && parts[0]) {
      return parts[0];
    }
  }

  // lvh.me (para pruebas de subdominios localmente)
  if (hostname.endsWith(".lvh.me")) {
    const parts = hostname.split(".lvh.me");
    if (parts.length > 1 && parts[0]) {
      return parts[0];
    }
  }

  // Dominio principal en producción
  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
  if (mainDomain && hostname.endsWith(`.${mainDomain}`)) {
    const parts = hostname.split(`.${mainDomain}`);
    if (parts.length > 1 && parts[0]) {
      return parts[0];
    }
  }

  return null;
}

export function hasTenantContext(): boolean {
  if (typeof window === "undefined") return false;

  const subdomain = getSubdomain();
  if (subdomain && subdomain !== "www" && subdomain !== "admin") {
    return true;
  }

  return Boolean(window.localStorage.getItem("active_tenant_id"));
}

export function buildAuthHeaders(token?: string, skipTenant?: boolean, tenantIdOrSlug?: string): HeadersInit {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (!skipTenant) {
    if (tenantIdOrSlug) {
      const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantIdOrSlug);
      if (isGuid) {
        headers["X-Tenant-ID"] = tenantIdOrSlug;
      } else {
        headers["X-Tenant-Slug"] = tenantIdOrSlug.toLowerCase();
        headers["X-Tenant-ID"] = tenantIdOrSlug;
      }
    } else if (typeof window !== "undefined") {
      const subdomain = getSubdomain();
      if (subdomain && subdomain !== "www" && subdomain !== "admin") {
        headers["X-Tenant-Slug"] = subdomain.toLowerCase();
      } else {
        const tenantId = window.localStorage.getItem("active_tenant_id");
        if (tenantId) {
          const isGuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tenantId);
          if (isGuid) {
            headers["X-Tenant-ID"] = tenantId;
          } else {
            headers["X-Tenant-Slug"] = tenantId.toLowerCase();
            headers["X-Tenant-ID"] = tenantId;
          }
        }
      }
    }
  }

  return headers;
}
