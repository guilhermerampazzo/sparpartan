"use client";

import { useState } from "react";

const ABAS = [
  { key: "resumo", label: "Resumo" },
  { key: "financeiro", label: "Financeiro" },
  { key: "documentos", label: "Documentos" },
  { key: "checklist", label: "Checklist" },
  { key: "historico", label: "Histórico" },
] as const;

type Aba = (typeof ABAS)[number]["key"];

export function VendaTabs({
  resumo,
  financeiro,
  documentos,
  checklist,
  historico,
}: Record<Aba, React.ReactNode>) {
  const [abaAtiva, setAbaAtiva] = useState<Aba>("resumo");
  const conteudo: Record<Aba, React.ReactNode> = { resumo, financeiro, documentos, checklist, historico };

  return (
    <div className="space-y-gutter">
      <div className="flex flex-wrap gap-2 border-b border-outline-variant">
        {ABAS.map((aba) => (
          <button
            key={aba.key}
            type="button"
            onClick={() => setAbaAtiva(aba.key)}
            className={`px-4 py-2.5 font-display text-label-lg font-semibold transition ${
              abaAtiva === aba.key
                ? "border-b-2 border-primary text-primary"
                : "text-outline hover:text-primary"
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>
      <div>{conteudo[abaAtiva]}</div>
    </div>
  );
}
