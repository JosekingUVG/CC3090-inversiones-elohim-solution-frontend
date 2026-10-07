"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";

const quantityPresets = [1, 2, 4, 8, 16, 32];

type QuantitySelectorProps = {
  value: number;
  onChange: (quantity: number) => void;
  min?: number;
  max?: number;
  label?: string;
};

export function QuantitySelector({
  value,
  onChange,
  min = 1,
  max,
  label = "Cantidad",
}: QuantitySelectorProps) {
  const [inputValue, setInputValue] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  const [previousValue, setPreviousValue] = useState(value);
  if (previousValue !== value) {
    setPreviousValue(value);
    setInputValue(String(value));
    setError(null);
  }

  const validateQuantity = (rawValue: string) => {
    if (rawValue.trim() === "") {
      setError("La cantidad es obligatoria");
      return;
    }

    if (/[.,]/.test(rawValue)) {
      setError("Solo números enteros, sin decimales");
      return;
    }

    if (!/^[0-9]+$/.test(rawValue)) {
      setError("Solo se permiten dígitos");
      return;
    }

    const numeric = Number(rawValue);
    if (!Number.isInteger(numeric)) {
      setError("Solo números enteros, sin decimales");
      return;
    }

    if (numeric < min) {
      setError(`La cantidad mínima es ${min}`);
      return;
    }

    if (typeof max === "number" && numeric > max) {
      setError(`No hay suficiente stock. Solo quedan ${max} unidades disponibles.`);
      return;
    }

    setError(null);
    onChange(numeric);
  };

  const handleInputChange = (nextValue: string) => {
    setInputValue(nextValue);
    validateQuantity(nextValue);
  };

  const handlePreset = (preset: number) => {
    setInputValue(String(preset));
    setError(null);
    onChange(preset);
  };

  return (
    <div className="space-y-3!">
      <div className="flex! flex-wrap! items-center! gap-2!">
        {quantityPresets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handlePreset(preset)}
            className={`rounded-full! border! px-3! py-2! text-sm! font-medium! transition! ${
              value === preset
                ? "border-blue-600! bg-blue-600! text-white!"
                : "border-slate-300! bg-white! text-slate-700! hover:border-slate-400! hover:bg-slate-50!"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      <div className="grid! gap-2! sm:grid-cols-[1fr_auto]! items-end!">
        <div>
          <label className="text-xs! uppercase! tracking-[0.2em]! text-slate-500!">{label}</label>
          <Input
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            value={inputValue}
            onChange={(e) => handleInputChange(e.target.value)}
            className="mt-2! h-11! rounded-xl! border-gray-200! bg-slate-50! text-slate-900! placeholder:text-slate-400! focus:border-blue-400! focus:bg-white! focus:ring-blue-400/30!"
          />
        </div>
        <span className="text-sm! font-medium! text-slate-500!">
          {max ? `Máx. ${max}` : "Máx. ilimitado"}
        </span>
      </div>

      {error && <p className="text-sm! text-red-600!">{error}</p>}
    </div>
  );
}
