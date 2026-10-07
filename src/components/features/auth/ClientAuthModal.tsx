"use client";

import { useEffect, useState } from "react";
import { useClientAuthStore } from "@/stores/useClientAuthStore";
import { login, register } from "@/lib/api/auth";
import { toast } from "sonner";
import { Eye, EyeOff, Lock, Mail, Phone, User as UserIcon, X } from "lucide-react";

type ClientAuthModalProps = {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: "login" | "register";
};

export function ClientAuthModal({ isOpen, onClose, initialTab = "login" }: ClientAuthModalProps) {
  const loginClient = useClientAuthStore((state) => state.login);
  const [activeTab, setActiveTab] = useState<"login" | "register">(initialTab);
  const [isLoading, setIsLoading] = useState(false);

  // Form states
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [nombre, setNombre] = useState("");
  const [apellido, setApellido] = useState("");
  const [telefono, setTelefono] = useState("");
  const [mostrarContrasena, setMostrarContrasena] = useState(false);

  // Sync tab with initialTab when modal opens
  const [previousOpen, setPreviousOpen] = useState(isOpen);
  const [previousTab, setPreviousTab] = useState(initialTab);
  if (previousOpen !== isOpen || previousTab !== initialTab) {
    setPreviousOpen(isOpen);
    setPreviousTab(initialTab);
    if (isOpen) setActiveTab(initialTab);
  }

  // Handle ESC key to close modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

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
      onClose();
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
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Error al registrarse");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      {/* Modal Card */}
      <div className="relative w-full max-w-md transform rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-6 top-6 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors cursor-pointer border-none"
        >
          <X size={20} />
        </button>

        {/* Logo or Title */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-extrabold text-slate-900">Ingreso a la tienda</h2>
          <p className="text-xs text-slate-500 mt-1">Disfruta de tus compras, reservas y seguimiento de pedidos</p>
        </div>

        {/* Tab Selection */}
        <div className="flex border-b border-slate-100 mb-6">
          <button
            onClick={() => setActiveTab("login")}
            className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
              activeTab === "login"
                ? "border-[#1AB38C] text-[#1AB38C]"
                : "border-transparent text-slate-400 hover:text-slate-650"
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            onClick={() => setActiveTab("register")}
            className={`flex-1 pb-3 text-xs font-bold border-b-2 transition-all cursor-pointer ${
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white transition-all"
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white transition-all"
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

            <div className="flex justify-end text-[11px] font-bold">
              <button
                type="button"
                onClick={() => {
                  const tid = typeof window !== "undefined"
                    ? window.localStorage.getItem("active_tenant_id") || window.location.pathname.split("/")[2] || ""
                    : "";
                  if (tid) {
                    window.location.href = `/preview/${tid}/recuperar`;
                  } else {
                    toast.error("No se pudo determinar el ID de la tienda");
                  }
                }}
                className="bg-transparent border-none p-0 cursor-pointer font-bold text-[#1AB38C] hover:text-[#159474] transition-colors"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-xl bg-[#1AB38C] hover:bg-[#159474] text-white font-bold text-xs shadow-md transition-colors cursor-pointer border-none flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? "Iniciando sesión..." : "Ingresar"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegisterSubmit} className="space-y-4 max-h-[60vh] overflow-y-auto pr-1">
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
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-8 pr-3 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white transition-all"
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
                  className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white transition-all"
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white transition-all"
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white transition-all"
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
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-10 text-xs text-slate-900 outline-none focus:border-[#1AB38C] focus:bg-white transition-all"
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
              className="h-11 w-full rounded-xl bg-[#1AB38C] hover:bg-[#159474] text-white font-bold text-xs shadow-md transition-colors cursor-pointer border-none flex items-center justify-center disabled:opacity-50"
            >
              {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
