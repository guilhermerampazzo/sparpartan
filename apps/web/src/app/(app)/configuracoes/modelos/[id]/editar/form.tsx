"use client";

import { useActionState } from "react";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { atualizarModelo } from "../../actions";

export function EditarModeloForm({ modelo }: { modelo: { id: string; nome: string } }) {
  const atualizarComId = atualizarModelo.bind(null, modelo.id);
  const [estado, formAction] = useActionState(atualizarComId, null);
  const v = (nome: string, padrao = "") => estado?.valores?.[nome] ?? padrao;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Dados do Modelo">
        <Campo label="Nome" name="nome" required defaultValue={v("nome", modelo.nome)} />

        <label className="mt-4 flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Substituir arquivo .docx (opcional)
          </span>
          <input
            name="arquivo"
            type="file"
            accept=".docx"
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
          <span className="text-body-sm text-outline">
            Deixe em branco para manter o arquivo atual.
          </span>
        </label>
      </SectionCard>

      <SubmitButton>Salvar Alterações</SubmitButton>
    </form>
  );
}
