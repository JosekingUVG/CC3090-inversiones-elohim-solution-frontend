"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { login, register } from "@/lib/api/auth";
import { getTiendaPorIdOSlug, TiendaDto } from "@/lib/api/admin";
import { useClientAuthStore } from "@/stores/useClientAuthStore";
import { ReservasShell } from "@/components/features/reservas/ReservasShell";
import { cn, isDarkBg } from "@/lib/utils";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LogOut,
  Mail,
  Store,
  UserRound,
  X,
  ShoppingBag,
  Loader2,
} from "lucide-react";

type StoreProfileViewProps = {
  variant?: "page" | "modal";
  onClose?: () => void;
  storeId?: string;
  defaultTab?: "cuenta" | "compras";
};

function resolveTenantId(tiendaId: string | null) {
  if (typeof window === "undefined") {
    return tiendaId || "";
  }

  const hostname = window.location.hostname;

  if (hostname.includes(".lvh.me")) {
    return hostname.split(".lvh.me")[0] || "";
  }

  if (hostname.includes(".localhost")) {
    return hostname.split(".localhost")[0] || "";
  }

  const mainDomain = process.env.NEXT_PUBLIC_MAIN_DOMAIN;
  if (mainDomain && hostname.includes(`.${mainDomain}`)) {
    return hostname.split(`.${mainDomain}`)[0] || "";
  }

  return tiendaId || window.localStorage.getItem("active_tenant_id") || "";
}

export function StoreProfileView({
  variant = "page",
  onClose,
  storeId: propStoreId,
  defaultTab = "cuenta",
}: StoreProfileViewProps) {
  const router = useRouter();
  const params = useParams();
  const routeStoreId = (params?.id as string) || propStoreId || "";

  const cliente = useClientAuthStore((state) => state.cliente);
  const tiendaId = useClientAuthStore((state) => state.tiendaId);
  const isAuthenticated = useClientAuthStore((state) => state.isAuthenticated);
  const isSessionExpired = useClientAuthStore((state) => state.isSessionExpired());
  const logout = useClientAuthStore((state) => state.logout);
  const loginClient = useClientAuthStore((state) => state.login);

  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [profileSection, setProfileSection] = useState<"cuenta" | "compras">(defaultTab);
  const [isLoading, setIsLoading] = useState(false);
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [storeData, setStoreData] = useState<TiendaDto | null>(null);

  const effectiveTenantId = routeStoreId || resolveTenantId(tiendaId);

  useEffect(() => {
    if (!effectiveTenantId) return;
    let isMounted = true;
    getTiendaPorIdOSlug(effectiveTenantId)
      .then((data) => {
        if (isMounted) setStoreData(data);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [effectiveTenantId]);

  // Parse visual configuration and theme from store
  const visualConfig = useMemo<import("@/types/store-builder").StoreVisualConfig | null>(() => {
    if (!storeData?.configuracionVisual) return null;
    try {
      return typeof storeData.configuracionVisual === "string"
        ? JSON.parse(storeData.configuracionVisual)
        : storeData.configuracionVisual;
    } catch (e) {
      console.error("Error parsing visual config in StoreProfileView", e);
      return null;
    }
  }, [storeData]);

  const theme = visualConfig?.theme || {};
  const accentColor = theme.accentColor || "#1AB38C";
  const backgroundColor = theme.useGradient ? undefined : (theme.backgroundColor || "#FFFFFF");
  const backgroundImage = theme.useGradient ? (theme.backgroundGradient || "none") : "none";
  const isDark = isDarkBg(theme.backgroundColor || "#FFFFFF");

  const headerSection = visualConfig?.sections?.find((s) => s.type === "header") ||
                        visualConfig?.pages?.[0]?.sections?.find((s) => s.type === "header");
  const headerProps = headerSection?.properties || {};
  const storeLogo = headerProps.logoUrl || "";

  const tenantLabel = storeData?.nombre || effectiveTenantId || tiendaId || "Tienda activa";

  useEffect(() => {
    if (!isAuthenticated || !isSessionExpired) {
      return;
    }

    logout();
    toast.error("Tu sesión expiró. Inicia sesión nuevamente.");
  }, [isAuthenticated, isSessionExpired, logout]);

  const goBackToStore = () => {
    if (onClose) {
      onClose();
      return;
    }

    if (variant === "modal") {
      router.back();
      return;
    }

    if (routeStoreId) {
      router.push(`/preview/${routeStoreId}`);
      return;
    }

    router.push("/");
  };

  const handleLoginSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!correo || !contrasena) {
      toast.error("Ingresa correo y contraseña");
      return;
    }

    setIsLoading(true);
    try {
      const response = await login(correo, contrasena);

      loginClient(
        {
          usuarioId: response.usuarioId,
          correo: response.correo,
          nombre: response.nombre,
          tipoCliente: "particular",
        },
        response.token,
        response.expiraEn,
        effectiveTenantId
      );

      toast.success(`¡Bienvenido, ${response.nombre}!`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!correo || !contrasena || !nombre || !apellido) {
      toast.error("Por favor completa todos los campos requeridos");
      return;
    }

    setIsLoading(true);
    try {
      const response = await register({
        correo,
        nombre,
        apellido,
        contrasena,
        tipoUsuario: "cliente",
        tipoCliente: "particular",
      });

      loginClient(
        {
          usuarioId: response.usuarioId,
          correo: response.correo,
          nombre: response.nombre,
          tipoCliente: "particular",
        },
        response.token,
        response.expiraEn,
        effectiveTenantId
      );

      toast.success(`¡Cuenta creada con éxito! Bienvenido, ${response.nombre}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error al registrarse");
    } finally {
      setIsLoading(false);
    }
  };

  const shellClassName = cn(
    "relative overflow-hidden font-sans transition-colors",
    variant === "modal"
      ? "flex min-h-screen items-center justify-center px-4 py-6"
      : "min-h-screen px-4 py-8 sm:px-6 lg:px-8"
  );

  const shellStyle: React.CSSProperties & { "--accent-color": string } = {
    backgroundColor: backgroundColor,
    backgroundImage: backgroundImage !== "none" ? backgroundImage : undefined,
    color: isDark ? "#F8FAFC" : "#0F172A",
    "--accent-color": accentColor,
  };

  const panelStyle: React.CSSProperties = {
    backgroundColor: isDark ? "rgba(15, 23, 42, 0.85)" : "#FFFFFF",
    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
    color: isDark ? "#F8FAFC" : "#0F172A",
    backdropFilter: isDark ? "blur(16px)" : undefined,
  };

  const panelClassName = cn(
    "relative w-full overflow-hidden border shadow-[0_30px_80px_rgba(15,23,42,0.14)] transition-all",
    variant === "modal"
      ? "max-w-4xl rounded-[32px]"
      : "mx-auto max-w-4xl rounded-[36px]"
  );

  const inputClassName = cn(
    "h-11 w-full rounded-2xl border px-4 text-sm outline-none transition-all placeholder:text-slate-400 focus:border-[var(--accent-color)] focus:ring-4",
    isDark
      ? "border-slate-700/80 bg-slate-900/80 text-white focus:bg-slate-900 focus:ring-white/10"
      : "border-slate-200 bg-white/90 text-slate-900 focus:bg-white focus:ring-black/5"
  );

  const recuperarUrl = routeStoreId
    ? `/preview/${routeStoreId}/recuperar`
    : "/recuperar";

  return (
    <div className={shellClassName} style={shellStyle}>
      {/* Dynamic ambient glow matching the store's primary brand color */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div 
          style={{ backgroundColor: accentColor, opacity: isDark ? 0.18 : 0.12 }} 
          className="absolute left-[-120px] top-10 h-80 w-80 rounded-full blur-3xl transition-all" 
        />
        <div 
          style={{ backgroundColor: isDark ? "#38BDF8" : "#CBD5E1", opacity: isDark ? 0.08 : 0.5 }} 
          className="absolute right-[-90px] top-32 h-80 w-80 rounded-full blur-3xl transition-all" 
        />
      </div>

      <div className={panelClassName} style={panelStyle}>
        {variant === "modal" && (
          <button
            type="button"
            onClick={goBackToStore}
            style={{
              backgroundColor: isDark ? "rgba(15, 23, 42, 0.8)" : "rgba(255, 255, 255, 0.9)",
              borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
              color: isDark ? "#94A3B8" : "#64748B"
            }}
            className="absolute right-5 top-5 z-20 rounded-full border p-2 transition-colors hover:opacity-100 cursor-pointer"
            aria-label="Cerrar perfil"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="grid min-h-[72vh]">
          <section 
            style={{
              background: isDark
                ? `linear-gradient(180deg, ${accentColor}1F 0%, rgba(15, 23, 42, 0.4) 35%, rgba(15, 23, 42, 0.9) 100%)`
                : `linear-gradient(180deg, ${accentColor}14 0%, rgba(250, 250, 250, 0.6) 35%, #ffffff 100%)`
            }}
            className="flex flex-col justify-between px-6 py-8 sm:px-8 lg:px-10 lg:py-10"
          >
            <div className="space-y-6">
              {/* Header Title & Branding */}
              <div 
                style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(241, 245, 249, 1)" }}
                className="flex items-center justify-between flex-wrap gap-4 border-b pb-5"
              >
                <div className="flex items-center gap-3.5">
                  {storeLogo ? (
                    <img 
                      src={storeLogo} 
                      alt={tenantLabel} 
                      className="h-12 w-12 object-contain rounded-2xl border p-1 shadow-sm"
                      style={{ 
                        backgroundColor: isDark ? "rgba(15, 23, 42, 0.8)" : "#FFFFFF",
                        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                      }} 
                    />
                  ) : (
                    <div 
                      style={{ 
                        backgroundColor: accentColor, 
                        boxShadow: `0 8px 24px ${accentColor}40` 
                      }} 
                      className="flex h-12 w-12 items-center justify-center rounded-2xl text-white"
                    >
                      <Store className="h-6 w-6" />
                    </div>
                  )}
                  <div>
                    <p style={{ color: accentColor }} className="text-[11px] font-black uppercase tracking-[0.28em]">
                      {tenantLabel}
                    </p>
                    <h1 style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} className="text-2xl font-black tracking-tight sm:text-3xl">
                      Mi Cuenta
                    </h1>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goBackToStore}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#FFFFFF",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0",
                    color: isDark ? "#F8FAFC" : "#334155"
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-xs font-bold transition-all hover:opacity-90 cursor-pointer shadow-xs"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Volver a la tienda</span>
                </button>
              </div>

              {/* Authenticated State */}
              {isAuthenticated ? (
                <div className="space-y-6">
                  {/* Navigation Tabs */}
                  <div 
                    style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0" }}
                    className="flex items-center gap-2 border-b pb-2"
                  >
                    <button
                      type="button"
                      onClick={() => setProfileSection("cuenta")}
                      style={profileSection === "cuenta" ? { 
                        backgroundColor: accentColor, 
                        color: "#FFFFFF", 
                        boxShadow: `0 4px 14px ${accentColor}40` 
                      } : { 
                        color: isDark ? "#94A3B8" : "#475569" 
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-none",
                        profileSection === "cuenta" ? "" : isDark ? "hover:bg-slate-800/60" : "hover:bg-slate-100"
                      )}
                    >
                      <UserRound className="h-4 w-4" />
                      <span>Datos del Perfil</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileSection("compras")}
                      style={profileSection === "compras" ? { 
                        backgroundColor: accentColor, 
                        color: "#FFFFFF", 
                        boxShadow: `0 4px 14px ${accentColor}40` 
                      } : { 
                        color: isDark ? "#94A3B8" : "#475569" 
                      }}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border-none",
                        profileSection === "compras" ? "" : isDark ? "hover:bg-slate-800/60" : "hover:bg-slate-100"
                      )}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Mis Compras</span>
                    </button>
                  </div>

                  {profileSection === "cuenta" ? (
                    <div 
                      style={{
                        backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#FFFFFF",
                        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                      }}
                      className="rounded-3xl border p-6 shadow-sm space-y-6"
                    >
                      <div className="flex items-start gap-4">
                        <div 
                          style={{
                            backgroundColor: `${accentColor}18`,
                            color: accentColor,
                          }}
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl shadow-xs"
                        >
                          <UserRound className="h-7 w-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                            Cliente Activo
                          </p>
                          <h2 style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} className="mt-1 truncate text-2xl font-black">
                            {cliente?.nombre || "Cliente"}
                          </h2>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm">
                            <div 
                              style={{
                                backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#F8FAFC",
                                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9"
                              }}
                              className="flex items-center gap-2.5 p-3 rounded-2xl border"
                            >
                              <Mail className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Correo</span>
                                <span style={{ color: isDark ? "#F8FAFC" : "#1E293B" }} className="truncate block font-semibold">
                                  {cliente?.correo || "No disponible"}
                                </span>
                              </div>
                            </div>
                            <div 
                              style={{
                                backgroundColor: isDark ? "rgba(255, 255, 255, 0.04)" : "#F8FAFC",
                                borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9"
                              }}
                              className="flex items-center gap-2.5 p-3 rounded-2xl border"
                            >
                              <Store className="h-4 w-4 shrink-0" style={{ color: accentColor }} />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tienda</span>
                                <span style={{ color: isDark ? "#F8FAFC" : "#1E293B" }} className="truncate block font-semibold">
                                  {tenantLabel}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div 
                      style={{
                        backgroundColor: isDark ? "rgba(15, 23, 42, 0.6)" : "#FFFFFF",
                        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                      }}
                      className="rounded-3xl border p-6 shadow-sm"
                    >
                      <div className="mb-4">
                        <h3 style={{ color: isDark ? "#F8FAFC" : "#0F172A" }} className="text-base font-extrabold">
                          Historial de Compras y Reservas
                        </h3>
                        <p style={{ color: isDark ? "#94A3B8" : "#64748B" }} className="text-xs">
                          Consulta los pedidos y reservas que has realizado en esta tienda
                        </p>
                      </div>
                      <ReservasShell />
                    </div>
                  )}
                </div>
              ) : (
                /* Unauthenticated State: Login / Register Form */
                <div 
                  style={{
                    backgroundColor: isDark ? "rgba(15, 23, 42, 0.65)" : "#FFFFFF",
                    borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0"
                  }}
                  className="rounded-3xl border p-6 sm:p-8 shadow-sm max-w-xl mx-auto w-full"
                >
                  {/* Tab Selector */}
                  <div 
                    style={{
                      backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#F1F5F9"
                    }}
                    className="flex rounded-2xl p-1 mb-6"
                  >
                    <button
                      type="button"
                      onClick={() => setActiveTab("login")}
                      style={activeTab === "login" ? {
                        backgroundColor: isDark ? "rgba(15, 23, 42, 0.85)" : "#FFFFFF",
                        color: isDark ? "#F8FAFC" : "#0F172A",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                      } : {
                        color: isDark ? "#94A3B8" : "#64748B"
                      }}
                      className="flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-none"
                    >
                      Iniciar Sesión
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("register")}
                      style={activeTab === "register" ? {
                        backgroundColor: isDark ? "rgba(15, 23, 42, 0.85)" : "#FFFFFF",
                        color: isDark ? "#F8FAFC" : "#0F172A",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                      } : {
                        color: isDark ? "#94A3B8" : "#64748B"
                      }}
                      className="flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-none"
                    >
                      Crear Cuenta
                    </button>
                  </div>

                  {activeTab === "login" ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label 
                          style={{ color: isDark ? "#CBD5E1" : "#475569" }}
                          className="text-[11px] font-bold uppercase tracking-wider block text-left"
                        >
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            placeholder="tu@correo.com"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            className={inputClassName}
                          />
                          <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label 
                            style={{ color: isDark ? "#CBD5E1" : "#475569" }}
                            className="text-[11px] font-bold uppercase tracking-wider"
                          >
                            Contraseña
                          </label>
                          <Link
                            href={recuperarUrl}
                            style={{ color: accentColor }}
                            className="text-xs font-bold hover:underline"
                          >
                            ¿Olvidaste tu contraseña?
                          </Link>
                        </div>
                        <div className="relative">
                          <input
                            type={mostrarContrasena ? "text" : "password"}
                            required
                            placeholder="••••••••"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            className={cn(inputClassName, "pr-10")}
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarContrasena(!mostrarContrasena)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 border-none bg-transparent p-0 cursor-pointer"
                          >
                            {mostrarContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                          backgroundColor: accentColor,
                          boxShadow: `0 8px 24px ${accentColor}40`,
                        }}
                        className="w-full h-11 rounded-2xl text-white text-xs font-black transition-all hover:opacity-95 hover:scale-[1.005] cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4" />
                            <span>Iniciando sesión...</span>
                          </>
                        ) : (
                          <span>Iniciar Sesión</span>
                        )}
                      </button>
                    </form>
                  ) : (
                    <form onSubmit={handleRegisterSubmit} className="space-y-4">
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-1.5">
                          <label 
                            style={{ color: isDark ? "#CBD5E1" : "#475569" }}
                            className="text-[11px] font-bold uppercase tracking-wider block text-left"
                          >
                            Nombre
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Juan"
                            value={nombre}
                            onChange={(e) => setNombre(e.target.value)}
                            className={inputClassName}
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label 
                            style={{ color: isDark ? "#CBD5E1" : "#475569" }}
                            className="text-[11px] font-bold uppercase tracking-wider block text-left"
                          >
                            Apellido
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Pérez"
                            value={apellido}
                            onChange={(e) => setApellido(e.target.value)}
                            className={inputClassName}
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label 
                          style={{ color: isDark ? "#CBD5E1" : "#475569" }}
                          className="text-[11px] font-bold uppercase tracking-wider block text-left"
                        >
                          Correo Electrónico
                        </label>
                        <div className="relative">
                          <input
                            type="email"
                            required
                            placeholder="tu@correo.com"
                            value={correo}
                            onChange={(e) => setCorreo(e.target.value)}
                            className={inputClassName}
                          />
                          <Mail className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label 
                          style={{ color: isDark ? "#CBD5E1" : "#475569" }}
                          className="text-[11px] font-bold uppercase tracking-wider block text-left"
                        >
                          Contraseña
                        </label>
                        <div className="relative">
                          <input
                            type={mostrarContrasena ? "text" : "password"}
                            required
                            placeholder="Mínimo 8 caracteres"
                            value={contrasena}
                            onChange={(e) => setContrasena(e.target.value)}
                            className={cn(inputClassName, "pr-10")}
                          />
                          <button
                            type="button"
                            onClick={() => setMostrarContrasena(!mostrarContrasena)}
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 border-none bg-transparent p-0 cursor-pointer"
                          >
                            {mostrarContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                          backgroundColor: accentColor,
                          boxShadow: `0 8px 24px ${accentColor}40`,
                        }}
                        className="w-full h-11 rounded-2xl text-white text-xs font-black transition-all hover:opacity-95 hover:scale-[1.005] cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
                      >
                        {isLoading ? (
                          <>
                            <Loader2 className="animate-spin h-4 w-4" />
                            <span>Creando cuenta...</span>
                          </>
                        ) : (
                          <span>Crear Cuenta</span>
                        )}
                      </button>
                    </form>
                  )}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div 
              style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9" }}
              className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t pt-5"
            >
              <button
                type="button"
                onClick={goBackToStore}
                style={{
                  backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#FFFFFF",
                  borderColor: isDark ? "rgba(255, 255, 255, 0.12)" : "#E2E8F0",
                  color: isDark ? "#F8FAFC" : "#334155"
                }}
                className="inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-xs font-semibold transition-all hover:opacity-90 cursor-pointer"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Volver a la tienda</span>
              </button>

              {isAuthenticated && (
                <button
                  type="button"
                  onClick={() => {
                    logout();
                    toast.success("Sesión cerrada");
                    goBackToStore();
                  }}
                  style={{
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#0F172A",
                    color: "#FFFFFF"
                  }}
                  className="inline-flex items-center gap-2 rounded-2xl px-4 py-2.5 text-xs font-semibold transition-colors hover:opacity-90 cursor-pointer border-none shadow-xs"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Cerrar sesión</span>
                </button>
              )}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

