"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getPostLoginPath } from "@/lib/auth-routes";
import { useAuthStore } from "@/stores/useAuthStore";
import { useLandingAnimations } from "@/hooks/useLandingAnimations";
import { Store, Package, Lock, BarChart3, Paintbrush, UserPlus, Settings, Rocket, Shield, Headphones, ShoppingBag, Thermometer, Wifi, Smartphone, Factory, Truck, Zap, Check } from "lucide-react";

// ─── Theme palette for the store simulator ───────────────────────────────────
const THEMES = [
  { name: "Esmeralda (Predeterminado)", color: "#50f0c1", bg: "#22d3a6" },
  { name: "Océano Ártico", color: "#7bd0ff", bg: "#00a6e0" },
  { name: "Neón Cyber", color: "#d2d4ff", bg: "#afb6ff" },
  { name: "Dorado Industrial", color: "#facc15", bg: "#ca8a04" },
];

// ─── Icon map for features ────────────────────────────────────────────────────
const ICON_MAP: Record<string, React.ReactNode> = {
  store: <Store className="w-full h-full" />,
  package: <Package className="w-full h-full" />,
  lock: <Lock className="w-full h-full" />,
  chart: <BarChart3 className="w-full h-full" />,
  brush: <Paintbrush className="w-full h-full" />,
  user: <UserPlus className="w-full h-full" />,
  settings: <Settings className="w-full h-full" />,
  rocket: <Rocket className="w-full h-full" />,
  shield: <Shield className="w-full h-full" />,
  headphones: <Headphones className="w-full h-full" />,
  bag: <ShoppingBag className="w-full h-full" />,
  thermometer: <Thermometer className="w-full h-full" />,
  wifi: <Wifi className="w-full h-full" />,
  phone: <Smartphone className="w-full h-full" />,
  factory: <Factory className="w-full h-full" />,
  truck: <Truck className="w-full h-full" />,
  zap: <Zap className="w-full h-full" />,
  check: <Check className="w-full h-full" />,
};

// ─── Feature cards data ───────────────────────────────────────────────────────
const FEATURES = [
  { icon: "store", title: "Multi-tienda Unificada", color: "#50f0c1", link: "Configuración de suscursales", desc: "Gestiona múltiples sucursales y cajeros desde un solo panel. Separa marcas, territorios y bodegas sin duplicar datos." },
  { icon: "package", title: "Control de Catálogo", color: "#7bd0ff", link: "Control del Catálogo", desc: "Importación masiva de productos en segundos y asignación a sucursales según el volumen de ventas." },
  { icon: "lock", title: "Control de Acceso", color: "#d2d4ff", link: "Roles personalizados", desc: "Define permisos quirúrgicos: Administrador global, Cajero regional con trazabilidad total de auditoría." },
  { icon: "chart", title: "Reportes en Tiempo Real", color: "#22d3a6", link: "Telemetría y exportación BI", desc: "Visualiza inventarios estancados y rendimiento a través de dashboards predictivos con filtros instantáneos." },
  { icon: "brush", title: "Temas Personalizables", color: "#c4e7ff", link: "Motor de contructor de tienda", desc: "Adapta la identidad de marca con un clic: paletas de color, slugs y logos en vivo." }
];

// ─── Steps data ───────────────────────────────────────────────────────────────
const STEPS = [
  { step: "01", label: "Paso 01 • En 60 Segundos", icon: "user", color: "#50f0c1", title: "Crea tu Cuenta", desc: "Registra tu empresa mayorista, elige tu subdominio de orquestación y define la estructura principal de almacenes y moneda base." },
  { step: "02", label: "Paso 02 • Configuración", icon: "settings", color: "#7bd0ff", title: "Configura tu Tienda", desc: "Importa tu catálogo por Excel, personaliza tu marca corporativa." },
  { step: "03", label: "Paso 03 • Operación Total", icon: "rocket", color: "#22d3a6", title: "Empieza a Vender", desc: "Invita a tus compradores B2B, distribuye credenciales a tu fuerza comercial y monitorea despachos en tiempo real." },
];

// ─── Role cards data ──────────────────────────────────────────────────────────
const ROLES = [
  { icon: "shield", title: "Administrador", badge: "Full Control", color: "#50f0c1", level: "Root 00", sub: "Gobernanza global del ecosistema, auditoría y control financiero centralizado.", features: ["Ajustes globales y API keys", "Visión consolidada de facturación", "Auditoría de logs y accesos"] },
  { icon: "headphones", title: "Cajero", badge: "Operativo", color: "#7bd0ff", level: "Field Ops", sub: "Agilidad para crear cotizaciones rápidas, validar stock y atender cuentas clave.", features: ["Gestión de pedidos.", "Stock local por bodega física"] },
  { icon: "store", title: "Distribuidor", badge: "Multi-Store", color: "#22d3a6", level: "B2B Partner", sub: "Capacidad para reordenar por palets, coordinar sucursales y consultar créditos.", features: ["Precios por tramos de volumen", "Despachos multi-sucursal", "Líneas de crédito y estado de cuenta"] },
  { icon: "bag", title: "Cliente B2B", badge: "Comprador", color: "#d2d4ff", level: "Client Tier", sub: "Portal intuitivo para reposición rápida, autoservicio de facturas y rastreo.", features: ["Catálogo con precios negociados", "Reordenar pedido con 1 clic", "Facturación fiscal automática"] },
];

// ─── Store products data ──────────────────────────────────────────────────────
const PRODUCTS = [
  { sku: "IND-SEN-992", emoji: "thermometer", lot: "Lote: 500 uds", name: "Sensor Térmico IoT Industrial", desc: "Conectividad LoRaWAN y certificación IP68 para monitoreo de cadena de frío.", price: "$28.50", original: "$42.00" },
  { sku: "NET-GTW-400", emoji: "wifi", lot: "Lote: 100 uds", name: "Gateway B2B Multi-Red Pro", desc: "Enrutador gigabit de alta densidad para hubs logísticos y almacenes automatizados.", price: "$154.00", original: "$210.00" },
  { sku: "LOG-SCN-210", emoji: "phone", lot: "Lote: 50 uds", name: "Lector Óptico Ruggerizado 2D", desc: "Escaneo de alta velocidad con batería intercambiable de 18 horas de autonomía.", price: "$119.90", original: "$180.00" },
];

// ─── Social proof logos ───────────────────────────────────────────────────────
const LOGOS = [
  { icon: "factory", name: "LogixPro", color: "#7bd0ff" },
  { icon: "truck", name: "DistriSur", color: "#50f0c1" },
  { icon: "zap", name: "NovaMarket", color: "#d2d4ff" },
  { icon: "store", name: "OmniRetail", color: "#22d3a6" },
  { icon: "zap", name: "AndesB2B", color: "#7bd0ff" },
  { icon: "package", name: "NexoRed", color: "#5ffccc" },
];

// ─── Telemetry metrics ────────────────────────────────────────────────────────
const METRICS = [
  { label: "Ventas Totales (USD)", value: "$148,290.00", sub: "Q3 Actual", badge: "+24.8%", color: "#50f0c1", pct: 78 },
  { label: "Distribuidores Activos", value: "842", sub: "En 14 Regiones", badge: "12 Nuevos", color: "#7bd0ff", pct: 92 },
  { label: "Tasa de Surtido B2B", value: "4.2%", sub: "Conversión SKU", badge: "99.4% SLA", color: "#22d3a6", pct: 86 },
];

// ─── Orders data ──────────────────────────────────────────────────────────────
const ORDERS = [
  { name: "DistriSur Bogotá", order: "PO-9402 • 1,200 uds", status: "Despachado", color: "#50f0c1" },
  { name: "LogixPro Santiago", order: "PO-9398 • 4,850 uds", status: "Tránsito", color: "#7bd0ff" },
  { name: "OmniRetail Lima", order: "PO-9382 • 890 uds", status: "Revisión", color: "#bacac2" },
];

// ─────────────────────────────────────────────────────────────────────────────
export default function LandingPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const usuario = useAuthStore((s) => s.usuario);

  // ── GSAP Refs ────────────────────────────────────────────────────────────
  const mainRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const shapeOrb1Ref = useRef<HTMLDivElement>(null);
  const shapeOrb2Ref = useRef<HTMLDivElement>(null);
  const shapeCube1Ref = useRef<HTMLDivElement>(null);
  const shapeRingRef = useRef<HTMLDivElement>(null);
  const horizontalSectionRef = useRef<HTMLDivElement>(null); // unused in this layout
  const horizontalContainerRef = useRef<HTMLDivElement>(null); // unused in this layout
  const laserBeamRef = useRef<HTMLDivElement>(null);
  const stepsContainerRef = useRef<HTMLDivElement>(null);
  const navbarRef = useRef<HTMLElement>(null);
  const ctaSectionRef = useRef<HTMLElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const socialProofRef = useRef<HTMLDivElement>(null);

  // Mount all GSAP animations
  useLandingAnimations({
    mainRef, visualRef, shapeOrb1Ref, shapeOrb2Ref,
    shapeCube1Ref, shapeRingRef,
    horizontalSectionRef, horizontalContainerRef,
    laserBeamRef, stepsContainerRef,
    navbarRef, ctaSectionRef, featuresRef, socialProofRef,
  });

  // Store simulator theme state
  const [activeTheme, setActiveTheme] = useState(0);
  const theme = THEMES[activeTheme];

  // Redirect if already authenticated
  if (typeof window !== "undefined" && isAuthenticated && usuario) {
    router.push(getPostLoginPath(usuario.rol));
  }

  return (
    <div
      ref={mainRef}
      className="relative min-h-screen bg-[#0c141c] text-[#dbe3ef] overflow-x-hidden selection:bg-[#22D3A6] selection:text-[#00382a]"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ─── AMBIENT BACKGROUND GLOWS ──────────────────────────────────────── */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        {/* Large radial glow at top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1200px] h-[700px] bg-gradient-to-b from-[#22d3a6]/15 via-[#7bd0ff]/10 to-transparent blur-[140px]" />
        <div className="absolute top-[1600px] -left-48 w-[600px] h-[600px] bg-[#00a6e0]/10 blur-[130px]" />
        <div className="absolute top-[2800px] -right-48 w-[700px] h-[700px] bg-[#50f0c1]/10 blur-[150px]" />

        {/* Floating decorative shapes */}
        <div ref={shapeOrb1Ref} className="absolute top-[18%] left-[8%]  h-24 w-24 rounded-full bg-gradient-to-tr from-[#22D3A6]/30 to-[#7bd0ff]/40 backdrop-blur-xl border border-white/20 shadow-[0_0_30px_rgba(34,211,166,0.3)] hidden lg:block" />
        <div ref={shapeOrb2Ref} className="absolute top-[32%] right-[10%] h-32 w-32 rounded-full bg-gradient-to-br from-[#7bd0ff]/30 to-[#d2d4ff]/40 backdrop-blur-xl border border-white/20 shadow-[0_0_40px_rgba(123,208,255,0.3)] hidden lg:block" />
        <div ref={shapeCube1Ref} className="absolute top-[65%] left-[5%]  h-20 w-20 rounded-2xl border border-[#22D3A6]/40 bg-[#22D3A6]/5 backdrop-blur-md shadow-[0_0_20px_rgba(34,211,166,0.15)] hidden md:block" />
        <div ref={shapeRingRef} className="absolute top-[75%] right-[7%] h-36 w-36 rounded-full border-2 border-dashed border-[#7bd0ff]/40 hidden lg:block" />

        {/* Dot-matrix grid */}
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: "radial-gradient(#22D3A6 1px, transparent 1px)", backgroundSize: "36px 36px" }} />
      </div>

      {/* ─── NAVBAR ─────────────────────────────────────────────────────────── */}
      <header
        ref={navbarRef}
        className="fixed top-0 inset-x-0 z-50 bg-[#0c141c]/80 backdrop-blur-xl border-b border-[#3c4a44]/60 transition-all"
      >
        <div className="h-16 max-w-[1280px] mx-auto px-6 flex items-center justify-between gap-4">
          {/* Logo + Brand */}
          <div className="flex items-center gap-4">
            <button
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="flex items-center gap-2.5 focus:outline-none"
            >
              <img src="/logo.png" alt="DMHub Logo" className="h-8 w-auto object-contain" />
              <span className="text-[20px] font-semibold tracking-tight text-[#dbe3ef]" style={{ fontFamily: "'Geist', sans-serif" }}>DMHub</span>
            </button>
          </div>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            {[
              { label: "Características", href: "#caracteristicas" },
              { label: "Cómo Funciona", href: "#pasos" },
              { label: "Blog", href: "/blog" },
              { label: "Documentación", href: "http://docs.dmhub.fun", external: true },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                target={item.external ? "_blank" : undefined}
                rel={item.external ? "noopener noreferrer" : undefined}
                className="text-[14px] text-[#bacac2] hover:text-[#dbe3ef] transition-colors py-1.5 px-3 rounded-lg hover:bg-[#232b33]/50"
              >
                {item.label}
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/login?role=administrador")}
              className="hidden sm:inline-flex text-[13px] text-[#bacac2] hover:text-[#dbe3ef] transition-colors px-3 py-1.5"
            >
              Login
            </button>
            <button
              onClick={() => router.push("/register?role=administrador")}
              className="inline-flex items-center justify-center text-[11px] font-semibold tracking-wide uppercase px-5 py-2 rounded-xl bg-[#22d3a6] text-[#00382a] shadow-[0_0_24px_rgba(34,211,166,0.35)] hover:shadow-[0_0_32px_rgba(34,211,166,0.55)] active:scale-95 transition-all duration-200"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              Registro
            </button>
          </div>
        </div>
      </header>

      <main className="w-full pt-16 bg-[#0c141c]">

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 1 · HERO
        ═══════════════════════════════════════════════════════════════════ */}
        <section className="relative w-full max-w-[1280px] mx-auto px-6 pt-16 pb-24 flex flex-col items-center text-center z-10">

          {/* Live node badge */}
          <div className="gsap-hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#232b33]/80 shadow-[0_0_16px_rgba(34,211,166,0.12)] mb-8 border border-[#3c4a44]/60">
            <span className="w-2 h-2 rounded-full bg-[#50f0c1] animate-ping" />
            <span className="w-2 h-2 -ml-3 rounded-full bg-[#50f0c1]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#50f0c1]" style={{ fontFamily: "'Geist', sans-serif" }}>
              Red de Distribuidores Mayoristas
            </span>
          </div>

          {/* Headline */}
          <h1
            className="gsap-hero-title max-w-[960px] text-[48px] sm:text-[64px] font-semibold tracking-[-0.035em] leading-[1.1] text-[#dbe3ef] mb-6"
            style={{ fontFamily: "'Geist', sans-serif" }}
          >
            La Plataforma que Impulsa tu{" "}
            <span className="bg-gradient-to-r from-[#50f0c1] via-[#22d3a6] to-[#7bd0ff] bg-clip-text text-transparent">
              Distribución
            </span>
          </h1>

          {/* Subtitle */}
          <p className="gsap-hero-subtitle max-w-[700px] text-[18px] leading-[28px] tracking-[-0.01em] text-[#bacac2] mb-12">
            Gestiona múltiples tiendas desde un solo panel unificado.
            Centraliza inventarios multi-nodo, fija precios dinámicos por rol y optimiza tu liquidez
            comercial con sincronización en tiempo real.
          </p>

          {/* CTA Buttons */}
          <div className="gsap-hero-cta flex flex-col sm:flex-row items-center gap-4 mb-14">
            <button
              onClick={() => router.push("/register?role=administrador")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#22d3a6] text-[#00382a] font-semibold text-[15px] shadow-[0_0_32px_rgba(34,211,166,0.4)] hover:shadow-[0_0_48px_rgba(34,211,166,0.6)] hover:scale-[1.02] active:scale-[0.98] transition-all duration-200"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              <span>Comenzar Gratis</span>
            </button>
            <button
              onClick={() => router.push("/login?role=administrador")}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl bg-[#232b33]/70 hover:bg-[#232b33] text-[#dbe3ef] font-medium text-[15px] shadow-[0_4px_20px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all duration-200 border border-[#3c4a44]/60"
              style={{ fontFamily: "'Geist', sans-serif" }}
            >
              <span className="text-[#7bd0ff]">▶</span>
              <span>Ver Demostración</span>
            </button>
          </div>

          {/* Trust badges */}
          <div className="flex flex-wrap items-center justify-center gap-5 text-[#bacac2] text-[12px] mb-14" style={{ fontFamily: "'Geist', sans-serif" }}>
            <span className="flex items-center gap-1.5"><span className="w-4 h-4" style={{ color: "#50f0c1" }}>{ICON_MAP.check}</span> Sin tarjeta requerida</span>
            <span className="w-1 h-1 rounded-full bg-[#85948d]" />
            <span className="flex items-center gap-1.5"><span className="w-4 h-4" style={{ color: "#50f0c1" }}>{ICON_MAP.zap}</span> Despliegue en 60s</span>
          </div>
        </section>


        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 3 · FEATURES GRID
        ═══════════════════════════════════════════════════════════════════ */}
        <section id="caracteristicas" ref={featuresRef} className="w-full max-w-[1280px] mx-auto px-6 py-24">
          <div className="text-center max-w-[700px] mx-auto mb-16">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#50f0c1]" style={{ fontFamily: "'Geist', sans-serif" }}>Arquitectura Centralizada</span>
            <h2 className="gsap-section-heading text-[40px] sm:text-[44px] font-semibold leading-[52px] tracking-[-0.025em] text-[#dbe3ef] mt-1 mb-3" style={{ fontFamily: "'Geist', sans-serif" }}>
              Todo lo que necesitas para escalar tu distribución
            </h2>
            <p className="text-[15px] text-[#bacac2] leading-[24px]">
              Una suite tecnológica integral diseñada para resolver la fragmentación operativa, la visibilidad de inventarios y los márgenes mayoristas.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="gsap-feature-card group p-8 rounded-2xl bg-[#182029]/60 hover:bg-[#232b33]/70 shadow-[0_4px_24px_rgba(0,0,0,0.25)] transition-all duration-300 flex flex-col justify-between border border-[#3c4a44]/40 hover:border-[#3c4a44]/80 hover:-translate-y-1"
              >
                <div>
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-6 group-hover:scale-110 transition-transform shadow-inner"
                    style={{ backgroundColor: `${f.color}18`, color: f.color }}
                  >
                    {ICON_MAP[f.icon]}
                  </div>
                  <h3 className="text-[24px] font-medium leading-[32px] tracking-[-0.02em] text-[#dbe3ef] mb-2" style={{ fontFamily: "'Geist', sans-serif" }}>{f.title}</h3>
                  <p className="text-[15px] text-[#bacac2] leading-[24px]">{f.desc}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-[#3c4a44]/40 flex items-center gap-1 text-[12px] font-medium" style={{ color: f.color, fontFamily: "'Geist', sans-serif" }}>
                  <span>{f.link}</span>
                  <span>→</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 4 · HOW IT WORKS (3 STEPS)
        ═══════════════════════════════════════════════════════════════════ */}
        <section
          id="pasos"
          ref={stepsContainerRef}
          className="w-full bg-[#070f17]/80 py-24 relative border-y border-[#3c4a44]/40"
        >
          <div className="max-w-[1280px] mx-auto px-6">
            <div className="text-center max-w-[650px] mx-auto mb-16">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-[#7bd0ff]" style={{ fontFamily: "'Geist', sans-serif" }}>Fácil Implementación</span>
              <h2 className="gsap-section-heading text-[40px] sm:text-[44px] font-semibold leading-[52px] tracking-[-0.025em] text-[#dbe3ef] mt-1 mb-3" style={{ fontFamily: "'Geist', sans-serif" }}>
                En marcha en 3 sencillos pasos
              </h2>
              <p className="text-[15px] text-[#bacac2] leading-[24px]">
                Sin ciclos de desarrollo de meses. Transforma tu red de distribución comercial en menos de un día laborable.
              </p>
            </div>

            <div className="relative grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Laser beam connector */}
              <div className="hidden md:block absolute top-[4.5rem] left-[calc(16.67%+2rem)] right-[calc(16.67%+2rem)] h-0.5 z-0 overflow-hidden rounded-full bg-[#3c4a44]/40">
                <div
                  ref={laserBeamRef}
                  className="h-full w-full bg-gradient-to-r from-[#50f0c1] via-[#7bd0ff] to-[#22d3a6] origin-left scale-x-0 shadow-[0_0_20px_#22d3a6]"
                />
              </div>

              {STEPS.map((s) => (
                <div
                  key={s.step}
                  className="gsap-step-card relative z-10 flex flex-col items-center text-center p-6 rounded-2xl bg-[#182029]/70 shadow-lg border border-[#3c4a44]/40"
                >
                  <div className="step-icon relative w-16 h-16 rounded-2xl bg-[#232b33] flex items-center justify-center mb-4 text-3xl shadow-md" style={{ color: s.color }}>
                    {ICON_MAP[s.icon]}
                    <div
                      className="absolute -top-2 -right-2 w-7 h-7 rounded-full text-[#00382a] text-[14px] font-bold flex items-center justify-center shadow-md"
                      style={{ backgroundColor: s.color, fontFamily: "'Geist', sans-serif" }}
                    >
                      {parseInt(s.step)}
                    </div>
                  </div>
                  <span className="step-badge text-[12px] uppercase tracking-wider mb-2 font-medium" style={{ color: s.color, fontFamily: "'Geist', sans-serif" }}>{s.label}</span>
                  <h3 className="text-[24px] font-medium tracking-[-0.02em] text-[#dbe3ef] mb-2" style={{ fontFamily: "'Geist', sans-serif" }}>{s.title}</h3>
                  <p className="text-[15px] text-[#bacac2] leading-[24px]">{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════
            SECTION 7 · CTA BANNER
        ═══════════════════════════════════════════════════════════════════ */}
        <section ref={ctaSectionRef} id="precios" className="w-full max-w-[1280px] mx-auto px-6 py-24">
          <div className="relative rounded-3xl bg-gradient-to-b from-[#232b33]/90 to-[#070f17] p-10 md:p-16 text-center overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.8),0_0_50px_rgba(34,211,166,0.15)] flex flex-col items-center border border-[#3c4a44]/60">
            {/* Radial aura */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-96 bg-[#50f0c1]/20 blur-[100px] pointer-events-none" />

            <div className="relative z-10 max-w-[800px] flex flex-col items-center">
              <div className="w-14 h-14 rounded-2xl bg-[#50f0c1]/10 flex items-center justify-center mb-6 shadow-[0_0_24px_rgba(80,240,193,0.3)] text-3xl border border-[#50f0c1]/20" style={{ color: "#50f0c1" }}>
                {ICON_MAP.zap}
              </div>
              <h2 className="gsap-cta-title text-[36px] md:text-[52px] font-semibold leading-[1.1] tracking-[-0.035em] text-[#dbe3ef] mb-4" style={{ fontFamily: "'Geist', sans-serif" }}>
                ¿Listo para transformar tu distribución?
              </h2>

              <div className="gsap-cta-buttons flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
                <button
                  onClick={() => router.push("/register?role=administrador")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-10 py-4 rounded-xl bg-[#22d3a6] text-[#00382a] font-semibold text-[15px] shadow-[0_0_36px_rgba(34,211,166,0.5)] hover:shadow-[0_0_48px_rgba(34,211,166,0.7)] hover:scale-[1.02] active:scale-[0.98] transition-all"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  <span>Comenzar</span>
                </button>
                <button
                  onClick={() => router.push("/login?role=administrador")}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-[#182029] text-[#dbe3ef] font-medium text-[15px] hover:bg-[#232b33] transition-colors border border-[#3c4a44]/60"
                  style={{ fontFamily: "'Geist', sans-serif" }}
                >
                  Iniciar sesión
                </button>
              </div>

              <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-[#85948d] text-[12px]" style={{ fontFamily: "'Geist', sans-serif" }}>
                <span className="gsap-cta-badge flex items-center gap-1"><span style={{ color: "#50f0c1" }} className="w-4 h-4">{ICON_MAP.check}</span> Configuración asistida</span>
                <span className="gsap-cta-badge flex items-center gap-1"><span style={{ color: "#50f0c1" }} className="w-4 h-4">{ICON_MAP.check}</span> Migración de catálogo incluida</span>
              </div>
            </div>
          </div>
        </section>

      </main>

      {/* ─── FOOTER ─────────────────────────────────────────────────────────── */}
      <footer className="w-full bg-[#070f17] py-16 border-t border-[#3c4a44]/40 relative z-10">
        <div className="max-w-[1280px] mx-auto px-6 flex flex-col gap-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
            {/* Brand column */}
            <div className="flex flex-col gap-4 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <img src="/logo.png" alt="DMHub Logo" className="h-7 w-auto object-contain" />
                <span className="text-[20px] font-semibold text-[#dbe3ef]" style={{ fontFamily: "'Geist', sans-serif" }}>DMHub</span>
              </div>
              <p className="text-[13px] text-[#bacac2] leading-[20px]">
                Orquestación mayorista multicanal y sincronización técnica de redes de distribución globales.
              </p>
            </div>
          </div>

          {/* Bottom bar */}
          <div className="pt-8 border-t border-[#3c4a44]/40 flex flex-col sm:flex-row items-center justify-between gap-4">
            <span className="text-[13px] text-[#bacac2]">© 2026 Distributors Marketplace Hub. Todos los derechos reservados.</span>
          </div>
        </div>
      </footer>
    </div>
  );
}