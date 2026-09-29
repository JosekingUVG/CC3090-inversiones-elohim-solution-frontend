"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { login, register } from "@/lib/api/auth";
import { getTiendaPorIdOSlug, TiendaDto } from "@/lib/api/admin";
import { useClientAuthStore } from "@/stores/useClientAuthStore";
import { ReservasShell } from "@/components/features/reservas/ReservasShell";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  Mail,
  Store,
  User as UserIcon,
  UserRound,
  X,
  ShoppingBag,
  Loader2,
  KeyRound,
  CheckCircle2,
} from "lucide-react";

type StoreProfileViewProps = {
  variant?: "page" | "modal";
  onClose?: () => void;
  storeId?: string;
  defaultTab?: "cuenta" | "compras";
};

const inputClassName =
  "h-11 w-full rounded-2xl border border-slate-200 bg-white/90 px-4 text-sm text-slate-900 outline-none transition-all placeholder:text-slate-400 focus:border-[#1AB38C] focus:bg-white focus:ring-4 focus:ring-[#1AB38C]/10";

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
    "relative overflow-hidden bg-[#fafafa] text-slate-900 font-sans",
    variant === "modal"
      ? "flex min-h-screen items-center justify-center px-4 py-6"
      : "min-h-screen px-4 py-8 sm:px-6 lg:px-8"
  );

  const panelClassName = cn(
    "relative w-full overflow-hidden border border-slate-200 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.14)]",
    variant === "modal"
      ? "max-w-4xl rounded-[32px]"
      : "mx-auto max-w-4xl rounded-[36px]"
  );

  const recuperarUrl = routeStoreId
    ? `/preview/${routeStoreId}/recuperar`
    : "/recuperar";

  return (
    <div className={shellClassName}>
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute left-[-120px] top-10 h-72 w-72 rounded-full bg-[#1AB38C]/12 blur-3xl" />
        <div className="absolute right-[-90px] top-32 h-80 w-80 rounded-full bg-slate-200/70 blur-3xl" />
      </div>

      <div className={panelClassName}>
        {variant === "modal" && (
          <button
            type="button"
            onClick={goBackToStore}
            className="absolute right-5 top-5 z-20 rounded-full border border-slate-200 bg-white/90 p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 cursor-pointer"
            aria-label="Cerrar perfil"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        <div className="grid min-h-[72vh]">
          <section className="flex flex-col justify-between bg-[linear-gradient(180deg,rgba(26,179,140,0.12),rgba(250,250,250,0.65)_40%,#ffffff)] px-6 py-8 sm:px-8 lg:px-10 lg:py-10">
            <div className="space-y-6">
              {/* Header Title & Branding */}
              <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-100 pb-5">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1AB38C] text-white shadow-lg shadow-[#1AB38C]/25">
                    <Store className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.28em] text-[#1AB38C]">
                      {tenantLabel}
                    </p>
                    <h1 className="text-2xl font-black tracking-tight text-slate-950 sm:text-3xl">
                      Mi Cuenta
                    </h1>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={goBackToStore}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  <span>Volver a la tienda</span>
                </button>
              </div>

              {/* Authenticated State */}
              {isAuthenticated ? (
                <div className="space-y-6">
                  {/* Navigation Tabs */}
                  <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                    <button
                      type="button"
                      onClick={() => setProfileSection("cuenta")}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        profileSection === "cuenta"
                          ? "bg-[#1AB38C] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                      )}
                    >
                      <UserRound className="h-4 w-4" />
                      <span>Datos del Perfil</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setProfileSection("compras")}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                        profileSection === "compras"
                          ? "bg-[#1AB38C] text-white shadow-sm"
                          : "text-slate-600 hover:text-slate-950 hover:bg-slate-100"
                      )}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Mis Compras</span>
                    </button>
                  </div>

                  {profileSection === "cuenta" ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
                      <div className="flex items-start gap-4">
                        <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-[#1AB38C]">
                          <UserRound className="h-7 w-7" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-400">
                            Cliente Activo
                          </p>
                          <h2 className="mt-1 truncate text-2xl font-black text-slate-950">
                            {cliente?.nombre || "Cliente"}
                          </h2>
                          <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-600">
                            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                              <Mail className="h-4 w-4 text-[#1AB38C] shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Correo</span>
                                <span className="truncate block font-semibold text-slate-800">{cliente?.correo || "No disponible"}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2.5 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                              <Store className="h-4 w-4 text-[#1AB38C] shrink-0" />
                              <div className="min-w-0">
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Tienda</span>
                                <span className="truncate block font-semibold text-slate-800">{tenantLabel}</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                      <div className="mb-4">
                        <h3 className="text-base font-extrabold text-slate-900">Historial de Compras y Reservas</h3>
                        <p className="text-xs text-slate-500">Consulta los pedidos y reservas que has realizado en esta tienda</p>
                      </div>
                      <ReservasShell />
                    </div>
                  )}
                </div>
              ) : (
                /* Unauthenticated State: Login / Register Form */
                <div className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm max-w-xl mx-auto w-full">
                  {/* Tab Selector */}
                  <div className="flex rounded-2xl bg-slate-100 p-1 mb-6">
                    <button
                      type="button"
                      onClick={() => setActiveTab("login")}
                      className={cn(
                        "flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-none",
                        activeTab === "login"
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:text-slate-900 bg-transparent"
                      )}
                    >
                      Iniciar Sesión
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab("register")}
                      className={cn(
                        "flex-1 py-2.5 text-xs font-extrabold rounded-xl transition-all cursor-pointer border-none",
                        activeTab === "register"
                          ? "bg-white text-slate-950 shadow-sm"
                          : "text-slate-500 hover:text-slate-900 bg-transparent"
                      )}
                    >
                      Crear Cuenta
                    </button>
                  </div>

                  {activeTab === "login" ? (
                    <form onSubmit={handleLoginSubmit} className="space-y-4">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block text-left">
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
                          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                            Contraseña
                          </label>
                          <Link
                            href={recuperarUrl}
                            className="text-xs font-bold text-[#1AB38C] hover:underline"
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
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent p-0 cursor-pointer"
                          >
                            {mostrarContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 rounded-2xl bg-[#1AB38C] hover:bg-[#169d7b] text-white text-xs font-black shadow-md shadow-[#1AB38C]/25 transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
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
                          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block text-left">
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
                          <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block text-left">
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
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block text-left">
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
                        <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block text-left">
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
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-none bg-transparent p-0 cursor-pointer"
                          >
                            {mostrarContrasena ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-11 rounded-2xl bg-[#1AB38C] hover:bg-[#169d7b] text-white text-xs font-black shadow-md shadow-[#1AB38C]/25 transition-all cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50 mt-2"
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
            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-5">
              <button
                type="button"
                onClick={goBackToStore}
                className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 cursor-pointer"
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
                  className="inline-flex items-center gap-2 rounded-2xl bg-slate-950 px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-slate-800 cursor-pointer border-none"
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
