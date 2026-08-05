"use client";

import { useState } from "react";

function paraCentavos(digitos: string) {
  return digitos.replace(/\D/g, "");
}

function formatar(digitos: string) {
  if (!digitos) return "";
  const numero = Number(digitos) / 100;
  return numero.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function CampoMoeda({
  label,
  name,
  required = false,
  defaultValue,
  onChange,
}: {
  label: string;
  name: string;
  required?: boolean;
  defaultValue?: string | number;
  onChange?: (valor: string) => void;
}) {
  const [digitos, setDigitos] = useState(() => {
    if (defaultValue === undefined || defaultValue === "") return "";
    const numero = Number(defaultValue);
    return Number.isFinite(numero) ? Math.round(numero * 100).toString() : "";
  });

  const numeroPuro = digitos ? (Number(digitos) / 100).toFixed(2) : "";

  return (
    <label className="flex flex-col gap-1">
      <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
        {label}
        {required ? " *" : ""}
      </span>
      <div className="flex items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 focus-within:border-primary">
        <span className="text-sm text-outline">R$</span>
        <input
          type="text"
          inputMode="decimal"
          value={formatar(digitos)}
          onChange={(e) => {
            const novosDigitos = paraCentavos(e.target.value);
            setDigitos(novosDigitos);
            onChange?.(novosDigitos ? (Number(novosDigitos) / 100).toFixed(2) : "");
          }}
          placeholder="0,00"
          className="w-full bg-transparent text-sm text-primary outline-none"
        />
      </div>
      <input type="hidden" name={name} value={numeroPuro} required={required} />
    </label>
  );
}
