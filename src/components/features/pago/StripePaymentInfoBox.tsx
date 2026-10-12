"use client";

import { ShieldCheck, Lock, ExternalLink, HelpCircle } from "lucide-react";

interface StripePaymentInfoBoxProps {
  isDark?: boolean;
}

export function StripePaymentInfoBox({ isDark = false }: StripePaymentInfoBoxProps) {
  return (
    <div
      style={{
        backgroundColor: isDark ? "rgba(15, 23, 42, 0.65)" : "rgba(248, 250, 252, 0.95)",
        borderColor: isDark ? "rgba(56, 189, 248, 0.2)" : "rgba(226, 232, 240, 0.9)",
      }}
      className="rounded-2xl border p-4 space-y-3 transition-all text-left shadow-sm"
    >
      <div className="flex items-center justify-between gap-2 border-b pb-2.5"
        style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(226, 232, 240, 0.8)" }}>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#635BFF]/15 text-[#635BFF]">
            <Lock size={14} strokeWidth={2.5} />
          </div>
          <div>
            <h4
              style={{ color: isDark ? "#F8FAFC" : "#0F172A" }}
              className="text-xs font-bold leading-none"
            >
              Metodología de Pago Seguro con Stripe
            </h4>
            <span
              style={{ color: isDark ? "#94A3B8" : "#64748B" }}
              className="text-[10px] font-medium"
            >
              Cifrado de extremo a extremo & Cumplimiento PCI-DSS Nivel 1
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] font-bold text-[#635BFF] bg-[#635BFF]/10 px-2 py-0.5 rounded-full">
          <ShieldCheck size={12} />
          <span>Stripe Certified</span>
        </div>
      </div>

      <div className="space-y-1.5 text-[11px] leading-relaxed" style={{ color: isDark ? "#CBD5E1" : "#475569" }}>
        <p>
          Tus pagos se procesan directamente mediante los servidores seguros de <strong>Stripe</strong>.
          Esta tienda <strong>nunca almacena</strong> tu número de tarjeta completo ni tu código de seguridad (CVC).
        </p>
        <ul className="list-disc pl-4 space-y-1 text-[10.5px]">
          <li><strong>Cifrado TLS/AES-256:</strong> Máxima protección durante la transmisión de los datos bancarios.</li>
          <li><strong>Tokenización bancaria:</strong> Tus tarjetas se guardan como tokens criptográficos seguros.</li>
          <li><strong>Prevención de fraude:</strong> Detección inteligente de transacciones sospechosas con Stripe Radar.</li>
        </ul>
      </div>

      <div
        className="pt-2 border-t flex flex-wrap items-center justify-between gap-2"
        style={{ borderColor: isDark ? "rgba(255, 255, 255, 0.08)" : "rgba(226, 232, 240, 0.8)" }}
      >
        <div className="flex items-center gap-1.5 text-[10px]" style={{ color: isDark ? "#94A3B8" : "#64748B" }}>
          <HelpCircle size={12} className="text-[#635BFF]" />
          <span>¿Tienes preguntas sobre el procesamiento de tu pago?</span>
        </div>
        <a
          href="https://docs.stripe.com/security/guide"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#635BFF] hover:text-[#4B45C6] hover:underline transition-all"
        >
          <span>Documentación oficial de Stripe</span>
          <ExternalLink size={11} />
        </a>
      </div>
    </div>
  );
}
