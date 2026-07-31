"use client";

import { useActionState, useState } from "react";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, BackButton } from "@/components/ui";
import type { EstadoForm } from "@/lib/validacao";

const TIPOS_PADRAO = [
  { value: "orcamento", label: "Orçamento" },
  { value: "vencimento", label: "Vencimento" },
  { value: "agendamento", label: "Agendamento" },
  { value: "cobranca", label: "Cobrança" },
  { value: "protocolo", label: "Protocolo" },
  { value: "prova", label: "Prova" },
  { value: "aniversario", label: "Aniversário" },
  { value: "geral", label: "Geral" },
];

export function TemplateForm({
  action,
  valoresIniciais,
  titulo,
  textoBotao,
}: {
  action: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  valoresIniciais?: { nome?: string; tipo?: string; assunto?: string; corpo?: string };
  titulo: string;
  textoBotao: string;
}) {
  const [estado, formAction] = useActionState(action, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? (valoresIniciais as Record<string, string> | undefined)?.[nome] ?? "";

  const tipoInicial = v("tipo") || "geral";
  const ehTipoPadrao = TIPOS_PADRAO.some((t) => t.value === tipoInicial);
  const [tipoLivre, setTipoLivre] = useState(!ehTipoPadrao);

  return (
    <div className="space-y-gutter">
      <BackButton href="/emails" />
      <h1 className="font-display text-headline-lg font-bold text-primary">{titulo}</h1>
      <p className="max-w-2xl text-sm text-outline">
        Use <code>{"{{nome}}"}</code> e <code>{"{{email}}"}</code> no assunto ou corpo — o sistema
        substitui pelos dados do cliente no momento do envio.
      </p>

      <form action={formAction} className="max-w-2xl space-y-6">
        <FormError erro={estado?.erro} />

        <SectionCard title="Template">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nome" name="nome" required defaultValue={v("nome")} />

            {tipoLivre ? (
              <label className="flex flex-col gap-1">
                <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                  Tipo
                </span>
                <div className="flex gap-2">
                  <input
                    name="tipo"
                    required
                    defaultValue={ehTipoPadrao ? "" : tipoInicial}
                    placeholder="Digite o tipo"
                    className="flex-1 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setTipoLivre(false)}
                    className="whitespace-nowrap text-sm text-primary hover:underline"
                  >
                    Usar lista
                  </button>
                </div>
              </label>
            ) : (
              <label className="flex flex-col gap-1">
                <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                  Tipo
                </span>
                <select
                  name="tipo"
                  defaultValue={tipoInicial}
                  onChange={(e) => {
                    if (e.target.value === "__outro__") setTipoLivre(true);
                  }}
                  className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                >
                  {TIPOS_PADRAO.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                  <option value="__outro__">Outro (digitar)...</option>
                </select>
              </label>
            )}
          </div>
          <div className="mt-4">
            <Campo label="Assunto" name="assunto" required defaultValue={v("assunto")} />
          </div>
          <label className="mt-4 flex flex-col gap-1">
            <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
              Corpo (HTML)
            </span>
            <textarea
              name="corpo"
              rows={8}
              required
              defaultValue={v("corpo")}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
            />
          </label>
        </SectionCard>

        <SubmitButton>{textoBotao}</SubmitButton>
      </form>
    </div>
  );
}
