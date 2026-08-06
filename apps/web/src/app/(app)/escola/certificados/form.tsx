"use client";

import { useActionState } from "react";
import { CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { criarCertificado } from "./actions";

export function NovoCertificadoForm({
  listaAlunos,
  listaMaterias,
}: {
  listaAlunos: { id: string; nome: string }[];
  listaMaterias: { id: string; titulo: string }[];
}) {
  const [estado, formAction] = useActionState(criarCertificado, null);

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Novo Certificado">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoSelect
            label="Aluno"
            name="alunoId"
            required
            defaultValue={estado?.valores?.alunoId as string ?? ""}
            options={[
              { value: "", label: "Selecione o aluno" },
              ...listaAlunos.map((a) => ({ value: a.id, label: a.nome })),
            ]}
          />
          <CampoSelect
            label="Matéria (opcional)"
            name="materiaId"
            defaultValue={estado?.valores?.materiaId as string ?? ""}
            options={[
              { value: "", label: "— Nenhuma —" },
              ...listaMaterias.map((m) => ({ value: m.id, label: m.titulo })),
            ]}
          />
        </div>
      </SectionCard>

      <SubmitButton>Criar Certificado (Para Emitir)</SubmitButton>
    </form>
  );
}
