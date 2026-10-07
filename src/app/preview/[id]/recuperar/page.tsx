"use client";

import type { StoreVisualConfig } from "@/types/store-builder";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Mail, Key, ShieldCheck, Eye, EyeOff, Loader2, Store } from "lucide-react";
import { toast } from "sonner";
import { getTiendaPorIdOSlug, TiendaDto } from "@/lib/api/admin";
import { recoverWithCode, solicitarCodigoRecuperacion } from "@/lib/api/auth";

export default function ClientRecuperarPage() {
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;

  const [store, setStore] = useState<TiendaDto | null>(null);
  const [visualConfig, setVisualConfig] = useState<StoreVisualConfig | null>(null);
  const [loadingStore, setLoadingStore] = useState(true);

  // Wizard Steps: 1 = Email, 2 = Code, 3 = New Password, 4 = Success
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Form State
  const [correo, setCorreo] = useState("");
  const [codigo, setCodigo] = useState("");
  const [nuevaContrasena, setNuevaContrasena] = useState("");
  const [confirmarContrasena, setConfirmarContrasena] = useState("");

  // UI State
  const [mostrarContrasena, setMostrarContrasena] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchStore = async () => {
      try {
        setLoadingStore(true);
        const data = await getTiendaPorIdOSlug(storeId);
        setStore(data);
        if (data.configuracionVisual) {
          try {
            const config = typeof data.configuracionVisual === "string"
              ? JSON.parse(data.configuracionVisual)
              : data.configuracionVisual;
            setVisualConfig(config);
          } catch (e) {
            console.error("Error parsing visual config", e);
          }
        }
      } catch (err) {
        console.error("Error loading store metadata", err);
        toast.error("Error al cargar la tienda");
      } finally {
        setLoadingStore(false);
      }
    };
    if (storeId) {
      void fetchStore();
    }
  }, [storeId]);

  useEffect(() => {
    if (store?.nombre) {
      document.title = `Recuperar Contraseña – ${store.nombre}`;
    } else {
      document.title = "Recuperar Contraseña";
    }
  }, [store]);

  // Extract visual properties from configuration
  const headerSection = visualConfig?.sections?.find((s) => s.type === "header") ||
                        visualConfig?.pages?.[0]?.sections?.find((s) => s.type === "header");
  
  const announcementSection = visualConfig?.sections?.find((s) => s.type === "announcement") ||
                              visualConfig?.pages?.[0]?.sections?.find((s) => s.type === "announcement");

  const headerProps = headerSection?.properties || {};
  const announcementProps = announcementSection?.properties || {};

  // Default color variables
  const storePrimaryColor = "#1AB38C"; // Default storefront teal
  const headerBgColor = headerProps.backgroundColor || "#FFFFFF";
  const headerTextColor = headerProps.textColor || "#0F172A";
  const announcementBgColor = announcementProps.backgroundColor || "#1AB38C";
  const announcementTextColor = announcementProps.textColor || "#FFFFFF";
  const storeLogo = headerProps.logoUrl || "";

  const handleNextStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (step === 1) {
      if (!correo || !correo.includes("@")) {
        setError("Por favor ingresa un correo electrónico válido");
        return;
      }
      setIsLoading(true);
      try {
        const res = await solicitarCodigoRecuperacion(correo, storeId);
        setSuccess(res.mensaje || "Se ha enviado un código de verificación a tu correo.");
        toast.success(res.mensaje || "Código de verificación enviado.");
        setStep(2);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error al solicitar el código de recuperación");
      } finally {
        setIsLoading(false);
      }
    } else if (step === 2) {
      if (!codigo || codigo.trim().length < 4) {
        setError("Por favor ingresa un código de recuperación válido");
        return;
      }
      setStep(3);
    }
  };

  const handlePrevStep = () => {
    setError("");
    if (step === 2) setStep(1);
    if (step === 3) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (!nuevaContrasena || nuevaContrasena.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (nuevaContrasena !== confirmarContrasena) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setIsLoading(true);

    try {
      setSuccess("Actualizando contraseña...");
      const response = await recoverWithCode(correo, codigo, nuevaContrasena);
      setSuccess(response.mensaje || "Contraseña restablecida con éxito");
      setStep(4);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al restablecer la contraseña");
      setSuccess("");
    } finally {
      setIsLoading(false);
    }
  };

  if (loadingStore) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="animate-spin text-[#1AB38C]" size={40} />
          <p className="text-sm font-medium text-slate-500">Cargando tienda...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Announcement Bar */}
      {announcementSection && (
        <div
          style={{
            backgroundColor: announcementBgColor,
            color: announcementTextColor,
            fontWeight: announcementProps.fontWeight === "Bold" ? "bold" : "normal",
            paddingTop: `${announcementProps.verticalPadding || 8}px`,
            paddingBottom: `${announcementProps.verticalPadding || 8}px`,
          }}
          className="text-center text-xs tracking-wider uppercase px-4 select-none"
        >
          {announcementProps.bannerText || "ENVÍO GRATIS EN PEDIDOS SUPERIORES A Q500"}
        </div>
      )}

      {/* Store Header */}
      <header
        style={{
          backgroundColor: headerBgColor,
          color: headerTextColor,
          borderBottom: "1px solid rgba(0, 0, 0, 0.05)"
        }}
        className="py-4 px-6 sticky top-0 z-30 transition-all shadow-sm"
      >
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href={`/preview/${storeId}`} className="flex items-center gap-3">
            {storeLogo ? (
              <img src={storeLogo} alt={store?.nombre} className="h-9 w-auto object-contain rounded-md" />
            ) : (
              <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
                <Store size={20} />
              </div>
            )}
            <span className="font-extrabold text-base tracking-tight">{store?.nombre}</span>
          </Link>

          <Link
            href={`/preview/${storeId}`}
            className="text-xs font-bold flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
          >
            <ArrowLeft size={14} />
            <span>Volver a la tienda</span>
          </Link>
        </div>
      </header>

      {/* Main recovery section */}
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="w-full max-w-md bg-white rounded-3xl border border-slate-100 p-8 shadow-xl shadow-slate-100">
          <h2 className="text-center text-xl font-extrabold text-slate-900 mb-1">
            Recuperar Contraseña
          </h2>
          <p className="text-center text-xs text-slate-500 mb-6">
            Usa el código proporcionado por el administrador de la tienda
          </p>

          {/* Steps tracker */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === s
                    ? "w-8"
                    : step > s
                    ? "w-3"
                    : "w-3 bg-slate-200"
                }`}
                style={{
                  backgroundColor: step === s ? storePrimaryColor : step > s ? `${storePrimaryColor}80` : undefined
                }}
              />
            ))}
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-2xl border border-rose-100 bg-rose-50 text-xs font-semibold text-rose-600 leading-relaxed">
              {error}
            </div>
          )}

          {success && step !== 4 && (
            <div className="mb-6 p-4 rounded-2xl border border-emerald-100 bg-emerald-50 text-xs font-semibold text-emerald-600 leading-relaxed">
              {success}
            </div>
          )}

          {/* STEP 1: EMAIL */}
          {step === 1 && (
            <form onSubmit={handleNextStep} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="correo" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Mail size={12} style={{ color: storePrimaryColor }} />
                  <span>Tu correo de cliente</span>
                </label>
                <input
                  id="correo"
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={correo}
                  onChange={(e) => setCorreo(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1AB38C] focus:bg-white transition-all disabled:opacity-50"
                  style={{ "--tw-focus-border": storePrimaryColor } as React.CSSProperties & { "--tw-focus-border": string }}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="h-11 w-full rounded-xl text-white font-bold text-xs shadow-md transition-all hover:scale-[1.01] cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ backgroundColor: storePrimaryColor }}
              >
                {isLoading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Enviando código...</span>
                  </>
                ) : (
                  <>
                    <span>Continuar</span>
                    <ArrowRight size={14} />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: CODE */}
          {step === 2 && (
            <form onSubmit={handleNextStep} className="space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="codigo" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                  <Key size={12} style={{ color: storePrimaryColor }} />
                  <span>Código de verificación</span>
                </label>
                <input
                  id="codigo"
                  type="text"
                  placeholder="Ingresa el código enviado a tu correo"
                  value={codigo}
                  onChange={(e) => setCodigo(e.target.value)}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1AB38C] focus:bg-white transition-all uppercase font-mono tracking-wider"
                />
                <p className="text-[10px] text-slate-500 leading-relaxed mt-1">
                  Hemos enviado un código único de 8 caracteres a tu dirección de correo electrónico.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
                >
                  <ArrowLeft size={14} />
                  <span>Atrás</span>
                </button>
                <button
                  type="submit"
                  className="h-11 flex-1 rounded-xl text-white font-bold text-xs shadow-md transition-all hover:scale-[1.01] cursor-pointer border-none flex items-center justify-center gap-2"
                  style={{ backgroundColor: storePrimaryColor }}
                >
                  <span>Siguiente</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          )}

          {/* STEP 3: NEW PASSWORD */}
          {step === 3 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="nuevaContrasena" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    id="nuevaContrasena"
                    type={mostrarContrasena ? "text" : "password"}
                    placeholder="Mínimo 8 caracteres"
                    value={nuevaContrasena}
                    onChange={(e) => setNuevaContrasena(e.target.value)}
                    disabled={isLoading}
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 pr-10 pl-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1AB38C] focus:bg-white transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setMostrarContrasena(!mostrarContrasena)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-600 bg-transparent border-none p-0 cursor-pointer"
                  >
                    {mostrarContrasena ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="confirmarContrasena" className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Confirmar Contraseña
                </label>
                <input
                  id="confirmarContrasena"
                  type={mostrarContrasena ? "text" : "password"}
                  placeholder="Repite tu contraseña"
                  value={confirmarContrasena}
                  onChange={(e) => setConfirmarContrasena(e.target.value)}
                  disabled={isLoading}
                  required
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[#1AB38C] focus:bg-white transition-all"
                />
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={handlePrevStep}
                  disabled={isLoading}
                  className="h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold text-xs transition-colors cursor-pointer flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <ArrowLeft size={14} />
                  <span>Atrás</span>
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="h-11 flex-1 rounded-xl text-white font-bold text-xs shadow-md transition-all hover:scale-[1.01] cursor-pointer border-none flex items-center justify-center gap-2 disabled:opacity-50"
                  style={{ backgroundColor: storePrimaryColor }}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Restableciendo...</span>
                    </>
                  ) : (
                    <span>Restablecer Contraseña</span>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* STEP 4: SUCCESS */}
          {step === 4 && (
            <div className="flex flex-col items-center justify-center text-center py-4 gap-5">
              <div
                style={{ backgroundColor: `${storePrimaryColor}15`, color: storePrimaryColor }}
                className="h-14 w-14 rounded-full flex items-center justify-center shadow-md animate-pulse"
              >
                <ShieldCheck size={28} />
              </div>

              <div className="space-y-2">
                <h4 className="text-base font-extrabold text-slate-900">¡Contraseña Restablecida!</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Tu contraseña ha sido actualizada con éxito. Ya puedes volver a la tienda e ingresar con tu nueva credencial.
                </p>
              </div>

              <button
                onClick={() => {
                  // Redirect to store and trigger opening the login modal
                  window.location.href = `/preview/${storeId}`;
                }}
                className="h-11 w-full rounded-xl text-white font-bold text-xs shadow-md transition-all hover:scale-[1.01] cursor-pointer border-none flex items-center justify-center gap-2"
                style={{ backgroundColor: storePrimaryColor }}
              >
                <span>Volver a la tienda</span>
                <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
