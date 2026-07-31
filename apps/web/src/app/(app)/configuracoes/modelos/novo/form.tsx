"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { importarModelo } from "../actions";

export function ImportarModeloForm({ listaServicos }: { listaServicos: { id: string; nome: string }[] }) {
  const [estado, formAction] = useActionState(importarModelo, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Dados do Modelo">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nome" name="nome" required defaultValue={v("nome")} />
          <Campo label="Norma" name="norma" defaultValue={v("norma")} />
          <Campo label="Categoria" name="categoria" defaultValue={v("categoria")} />
          <CampoSelect
            label="Serviço vinculado"
            name="servicoId"
            defaultValue={v("servicoId")}
            options={[
              { value: "", label: "Nenhum" },
              ...listaServicos.map((s) => ({ value: s.id, label: s.nome })),
            ]}
          />
          <Campo label="Validade (meses)" name="validadeMeses" type="number" defaultValue={v("validadeMeses")} />
        </div>
        <p className="mt-2 text-body-sm text-outline">
          Preencha a validade se o documento vence (ex: 12 para DPEM anual). O sistema passa a
          avisar você e o cliente 30, 15 e 7 dias antes do vencimento.
        </p>

        <label className="mt-4 flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Arquivo .docx
          </span>
          <input
            name="arquivo"
            type="file"
            accept=".docx"
            required
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>

        <div className="mt-4 flex gap-6">
          <label className="flex items-center gap-2 text-sm text-primary">
            <input type="checkbox" name="obrigatorio" /> Obrigatório no fluxo
          </label>
          <label className="flex items-center gap-2 text-sm text-primary">
            <input type="checkbox" name="duasVias" /> Sai em 2 vias
          </label>
          <label className="flex items-center gap-2 text-sm text-primary">
            <input type="checkbox" name="padraoParaObra" /> Modelo padrão para Obras
          </label>
        </div>
      </SectionCard>

      <SubmitButton>Importar Modelo</SubmitButton>
    </form>
  );
}
