"use client";

import { useActionState } from "react";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { criarTurma } from "./actions";

export function NovaTurmaForm() {
  const [estado, formAction] = useActionState(criarTurma, null);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Nova Turma">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Nome da turma" name="nome" required defaultValue={estado?.valores?.nome as string ?? ""} />
          <Campo label="Início (opcional)" name="inicioEm" type="date" defaultValue={estado?.valores?.inicioEm as string ?? ""} />
        </div>
        <label className="mt-4 flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Observações</span>
          <textarea
            name="observacoes"
            rows={2}
            defaultValue={estado?.valores?.observacoes as string ?? ""}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>
      </SectionCard>

      <SubmitButton>Criar Turma</SubmitButton>
    </form>
  );
}
