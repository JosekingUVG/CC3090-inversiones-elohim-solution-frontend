"use client";

import { useHydrated } from "@/hooks/useHydrated";

import { useEffect, useState } from "react";
import { useClientAuthStore } from "@/stores/useClientAuthStore";
import { login, register } from "@/lib/api/auth";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Phone, User as UserIcon } from "lucide-react";

type ClientProtectedRouteProps = {
  children: React.ReactNode;
};

export function ClientProtectedRoute({ children }: ClientProtectedRouteProps) {
  const isHydrated = useHydrated();
  const isAuthenticated = useClientAuthStore((state) => state.isAuthenticated);
  const isSessionExpired = useClientAuthStore((state) => state.isSessionExpired());
  const logout = useClientAuthStore((state) => state.logout);
  const loginClient = useClientAuthStore((state) => state.login);
  const selectTenant = useClientAuthStore((state) => state.selectTenant);

  // Synchronize client session with active store ID on protected pages
  useEffect(() => {
    if (typeof window !== "undefined") {
      const tenantId = window.localStorage.getItem("active_tenant_id");
      selectTenant(tenantId);
    }
  }, [selectTenant]);

  // Tabs for Auth: "login" | "register"
  const [activeTab, setActiveTab] = useState<"login" | "register">("login");
  const [isLoading, setIsLoading] = useState(false);

  // Form State
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  // Hydration check

  useEffect(() => {
    if (isHydrated && isAuthenticated && isSessionExpired) {
      logout();
      toast.error("Tu sesión ha expirado. Por favor inicia sesión nuevamente.");
    }
  }, [isHydrated, isAuthenticated, isSessionExpired, logout]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo || !contrasena) return;

    setIsLoading(true);
    try {
      const tenantId = window.localStorage.getItem("active_tenant_id") || "";
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
        tenantId
      );
      toast.success(`¡Bienvenido de vuelta, ${response.nombre}!`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correo || !contrasena || !nombre || !apellido) return;

    setIsLoading(true);
    try {
      const tenantId = window.localStorage.getItem("active_tenant_id") || "";
      const response = await register({
        correo,
        nombre,
        apellido,
        contrasena,
        telefono,
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
        tenantId
      );
      toast.success(`¡Cuenta creada con éxito! Bienvenido, ${response.nombre}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <p className="text-slate-500">Cargando...</p>
      </div>
    );
  }

  if (!isAuthenticated || isSessionExpired) {
    return (
      <div className="flex min-h-[70vh] items-center justify-center bg-slate-50 px-4 py-12">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-xl">
          <div className="flex border-b border-slate-100 mb-8">
            <button
              onClick={() => setActiveTab("login")}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "login"
                  ? "border-[#1AB38C] text-[#1AB38C]"
                  : "border-transparent text-slate-400 hover:text-slate-650"
              }`}
            >
              Iniciar Sesión
            </button>
            <button
              onClick={() => setActiveTab("register")}
              className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all cursor-pointer ${
                activeTab === "register"
                  ? "border-[#1AB38C] text-[#1AB38C]"
                  : "border-transparent text-slate-400 hover:text-slate-650"
              }`}
            >
              Crear Cuenta
            </button>
          </div>

          {activeTab === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="correo@ejemplo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={mostrarContrasena ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none p-0 cursor-pointer"
                  >
                    {mostrarContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-xl bg-[#1AB38C] hover:bg-[#159474] text-white font-bold text-xs shadow-md transition-colors cursor-pointer border-none flex items-center justify-center"
              >
                {isLoading ? "Iniciando sesión..." : "Ingresar"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Nombre</label>
                  <div className="relative">
                    <UserIcon size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Juan"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Apellido</label>
                  <input
                    type="text"
                    required
                    placeholder="Pérez"
                    value={apellido}
                    onChange={(e) => setApellido(e.target.value)}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Correo</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="correo@ejemplo.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Teléfono</label>
                <div className="relative">
                  <Phone size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    placeholder="12345678"
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Contraseña</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type={mostrarContrasena ? "text" : "password"}
                    required
                    placeholder="••••••••"
                    value={contrasena}
                    onChange={(e) => setContrasena(e.target.value)}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-none p-0 cursor-pointer"
                  >
                    {mostrarContrasena ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-xl bg-[#1AB38C] hover:bg-[#159474] text-white font-bold text-xs shadow-md transition-colors cursor-pointer border-none flex items-center justify-center"
              >
                {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
