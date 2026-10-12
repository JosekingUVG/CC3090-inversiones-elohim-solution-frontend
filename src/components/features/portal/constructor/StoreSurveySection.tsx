"use client";

import { useState } from "react";
import type { SectionProperties, SurveyQuestion } from "@/types/store-builder";
import { CheckCircle2, Star, Sparkles, Send, Check } from "lucide-react";
import { toast } from "sonner";
import { STORE_LAYOUT } from "./storeLayout";

interface StoreSurveySectionProps {
  properties: SectionProperties;
  isDark?: boolean;
  isInteractive?: boolean;
  accentColor?: string;
  style?: React.CSSProperties;
  id?: string;
  className?: string;
}

export function StoreSurveySection({
  properties,
  isDark = false,
  isInteractive = false,
  accentColor = "#22D3A6",
  style,
  id,
  className,
}: StoreSurveySectionProps) {
  const title = properties.surveyTitle || "Encuesta de Satisfacción";
  const description = properties.surveyDescription || "Nos encantaría conocer tu opinión para mejorar nuestro servicio y catálogo de productos.";
  const submitText = properties.surveySubmitText || "Enviar respuestas";
  const successMessage = properties.surveySuccessMessage || "¡Muchas gracias! Tus respuestas han sido registradas exitosamente.";
  const questions: SurveyQuestion[] = properties.surveyQuestions && properties.surveyQuestions.length > 0
    ? properties.surveyQuestions
    : [
        {
          id: "q1",
          title: "¿Cómo calificarías tu experiencia general en nuestra tienda?",
          type: "rating",
          required: true,
        },
        {
          id: "q2",
          title: "¿Qué categoría de productos te gustaría que ampliemos?",
          type: "choice",
          options: ["Novedades y Lanzamientos", "Ofertas y Descuentos", "Accesorios y Repuestos", "Servicio Técnico"],
          required: false,
        },
        {
          id: "q3",
          title: "¿Qué funciones adicionales te gustaría tener en la tienda?",
          type: "checkbox",
          options: ["Seguimiento de pedidos en vivo", "Notificaciones por WhatsApp", "Programa de puntos y lealtad"],
          required: false,
        },
        {
          id: "q4",
          title: "¿Tienes algún comentario, queja o sugerencia para nosotros?",
          type: "text",
          required: false,
        },
      ];

  const [answers, setAnswers] = useState<Record<string, string | string[] | number>>({});
  const [submitted, setSubmitted] = useState(false);

  const handleTextChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleChoiceChange = (id: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [id]: option }));
  };

  const handleCheckboxChange = (id: string, option: string) => {
    setAnswers((prev) => {
      const current = (prev[id] as string[]) || [];
      if (current.includes(option)) {
        return { ...prev, [id]: current.filter((o) => o !== option) };
      } else {
        return { ...prev, [id]: [...current, option] };
      }
    });
  };

  const handleRatingChange = (id: string, rating: number) => {
    setAnswers((prev) => ({ ...prev, [id]: rating }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isInteractive) {
      toast.info("Modo de vista previa: las respuestas no se guardan en el editor.");
      return;
    }

    // Validate required questions
    for (const q of questions) {
      if (q.required) {
        const val = answers[q.id];
        if (val === undefined || val === "" || (Array.isArray(val) && val.length === 0)) {
          toast.error(`Por favor responde la pregunta obligatoria: "${q.title}"`);
          return;
        }
      }
    }

    setSubmitted(true);
    toast.success("¡Encuesta enviada con éxito!");
  };

  const cardBg = isDark ? "rgba(15, 23, 42, 0.75)" : "#FFFFFF";
  const borderColor = isDark ? "rgba(255, 255, 255, 0.08)" : "#E2E8F0";
  const primaryTextColor = isDark ? "#F8FAFC" : "#0F172A";
  const secondaryTextColor = isDark ? "#94A3B8" : "#64748B";

  return (
    <section
      id={id}
      style={{
        backgroundColor: properties.backgroundColor || undefined,
        ...style,
      }}
      className={`${STORE_LAYOUT.section} py-12 px-4 flex justify-center items-center transition-all ${className || ""}`}
    >
      <div className="w-full max-w-2xl space-y-4">
        {/* Header Card Style Google Forms */}
        <div
          style={{ backgroundColor: cardBg, borderColor }}
          className="rounded-2xl border shadow-md overflow-hidden relative"
        >
          {/* Top color bar */}
          <div
            style={{ backgroundColor: accentColor }}
            className="h-2.5 w-full"
          />
          <div className="p-6 md:p-8 space-y-2.5 text-left">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-[#38BDF8] flex items-center gap-1">
                <Sparkles size={12} /> Encuesta de Opinión
              </span>
            </div>
            <h2
              style={{ color: primaryTextColor }}
              className="text-xl md:text-2xl font-black tracking-tight"
            >
              {title}
            </h2>
            {description && (
              <p
                style={{ color: secondaryTextColor }}
                className="text-xs md:text-sm leading-relaxed"
              >
                {description}
              </p>
            )}
            <div className="pt-2 text-[10px] font-medium text-red-400">
              * Indica que la pregunta es obligatoria
            </div>
          </div>
        </div>

        {submitted ? (
          /* Thank You Card */
          <div
            style={{ backgroundColor: cardBg, borderColor }}
            className="rounded-2xl border shadow-md p-8 text-center space-y-4 animate-fade-in"
          >
            <div className="flex justify-center">
              <div
                style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
              >
                <CheckCircle2 size={32} />
              </div>
            </div>
            <div className="space-y-1">
              <h3
                style={{ color: primaryTextColor }}
                className="text-lg font-bold"
              >
                ¡Respuesta registrada!
              </h3>
              <p
                style={{ color: secondaryTextColor }}
                className="text-xs md:text-sm max-w-md mx-auto"
              >
                {successMessage}
              </p>
            </div>
            {isInteractive && (
              <button
                type="button"
                onClick={() => {
                  setAnswers({});
                  setSubmitted(false);
                }}
                className="text-xs font-semibold text-[#38BDF8] hover:underline cursor-pointer bg-transparent border-none mt-2"
              >
                Enviar otra respuesta
              </button>
            )}
          </div>
        ) : (
          /* Form Questions */
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {questions.map((q, idx) => (
              <div
                key={q.id || idx}
                style={{ backgroundColor: cardBg, borderColor }}
                className="rounded-2xl border p-5 md:p-6 shadow-sm space-y-4 transition-all hover:border-slate-700/50"
              >
                <div className="flex items-start gap-1">
                  <span
                    style={{ color: primaryTextColor }}
                    className="text-sm font-bold leading-snug"
                  >
                    {idx + 1}. {q.title}
                  </span>
                  {q.required && <span className="text-red-500 font-bold ml-1">*</span>}
                </div>

                {/* Question Type: TEXT */}
                {q.type === "text" && (
                  <div className="pt-1">
                    <input
                      type="text"
                      disabled={!isInteractive}
                      placeholder="Tu respuesta..."
                      value={(answers[q.id] as string) || ""}
                      onChange={(e) => handleTextChange(q.id, e.target.value)}
                      style={{
                        backgroundColor: isDark ? "rgba(2, 6, 23, 0.5)" : "#F8FAFC",
                        borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "#E2E8F0",
                        color: primaryTextColor,
                      }}
                      className="w-full h-11 px-4 rounded-xl border text-xs outline-none focus:border-[var(--accent-color)] transition-all"
                    />
                  </div>
                )}

                {/* Question Type: CHOICE (Radio) */}
                {q.type === "choice" && (
                  <div className="space-y-2 pt-1">
                    {(q.options || ["Opción 1", "Opción 2"]).map((opt, optIdx) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isSelected
                              ? isDark
                                ? "border-[#22D3A6] bg-[#22D3A6]/10"
                                : "border-[#10B981] bg-emerald-50/60"
                              : isDark
                              ? "border-slate-800/80 bg-slate-900/40 hover:bg-slate-900"
                              : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`choice-${q.id}`}
                            disabled={!isInteractive}
                            checked={isSelected}
                            onChange={() => handleChoiceChange(q.id, opt)}
                            className="hidden"
                          />
                          <div
                            style={{
                              borderColor: isSelected ? accentColor : isDark ? "#475569" : "#CBD5E1",
                            }}
                            className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-transparent" : ""
                            }`}
                          >
                            {isSelected && (
                              <div
                                style={{ backgroundColor: accentColor }}
                                className="w-2 h-2 rounded-full"
                              />
                            )}
                          </div>
                          <span
                            style={{ color: primaryTextColor }}
                            className="text-xs font-medium"
                          >
                            {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Question Type: CHECKBOX */}
                {q.type === "checkbox" && (
                  <div className="space-y-2 pt-1">
                    {(q.options || ["Opción 1", "Opción 2"]).map((opt, optIdx) => {
                      const checkedList = (answers[q.id] as string[]) || [];
                      const isChecked = checkedList.includes(opt);
                      return (
                        <label
                          key={optIdx}
                          className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            isChecked
                              ? isDark
                                ? "border-[#22D3A6] bg-[#22D3A6]/10"
                                : "border-[#10B981] bg-emerald-50/60"
                              : isDark
                              ? "border-slate-800/80 bg-slate-900/40 hover:bg-slate-900"
                              : "border-slate-200/80 bg-slate-50/50 hover:bg-slate-100"
                          }`}
                        >
                          <input
                            type="checkbox"
                            disabled={!isInteractive}
                            checked={isChecked}
                            onChange={() => handleCheckboxChange(q.id, opt)}
                            className="hidden"
                          />
                          <div
                            style={{
                              borderColor: isChecked ? accentColor : isDark ? "#475569" : "#CBD5E1",
                              backgroundColor: isChecked ? accentColor : "transparent",
                            }}
                            className="w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-all text-slate-950"
                          >
                            {isChecked && <Check size={12} strokeWidth={3} />}
                          </div>
                          <span
                            style={{ color: primaryTextColor }}
                            className="text-xs font-medium"
                          >
                            {opt}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {/* Question Type: RATING (1 to 5) */}
                {q.type === "rating" && (
                  <div className="space-y-3 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {[1, 2, 3, 4, 5].map((num) => {
                        const isRated = (answers[q.id] as number) === num;
                        return (
                          <button
                            key={num}
                            type="button"
                            disabled={!isInteractive}
                            onClick={() => handleRatingChange(q.id, num)}
                            style={{
                              backgroundColor: isRated
                                ? accentColor
                                : isDark
                                ? "rgba(2, 6, 23, 0.6)"
                                : "#F8FAFC",
                              borderColor: isRated
                                ? accentColor
                                : isDark
                                ? "rgba(255, 255, 255, 0.1)"
                                : "#E2E8F0",
                              color: isRated ? "#0F172A" : primaryTextColor,
                            }}
                            className={`w-11 h-11 rounded-xl border flex flex-col items-center justify-center font-bold text-sm cursor-pointer transition-all hover:scale-105 ${
                              isRated ? "shadow-md" : ""
                            }`}
                          >
                            <span className="flex items-center gap-0.5">
                              {num} <Star size={10} className={isRated ? "fill-slate-950" : "text-amber-400"} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    <div
                      style={{ color: secondaryTextColor }}
                      className="flex justify-between text-[10px] px-1 font-medium"
                    >
                      <span>1: Muy insatisfecho</span>
                      <span>5: Excelente experiencia</span>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Submit Action */}
            <div className="flex items-center justify-between pt-2">
              <button
                type="submit"
                style={{ backgroundColor: accentColor }}
                className="h-11 px-6 rounded-xl font-bold text-slate-950 flex items-center gap-2 cursor-pointer transition-all hover:opacity-90 shadow-lg text-xs"
              >
                <Send size={14} />
                <span>{submitText}</span>
              </button>
              <button
                type="button"
                onClick={() => setAnswers({})}
                className="text-xs text-slate-500 hover:text-slate-300 cursor-pointer bg-transparent border-none"
              >
                Borrar formulario
              </button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}
