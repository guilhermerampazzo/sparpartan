"use client";

import { useActionState } from "react";
import { Campo, SubmitButton, FormError, BackButton } from "@/components/ui";
import { criarAluno } from "../actions";

export default function NovoAlunoPage() {
  const [estado, formAction] = useActionState(criarAluno, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  return (
    <div className="space-y-gutter">
      <BackButton href="/alunos" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Aluno</h1>

      <form
        action={formAction}
        className="max-w-3xl space-y-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
      >
        <FormError erro={estado?.erro} />

        <Campo label="Nome" name="nome" required defaultValue={v("nome")} />
        <Campo label="E-mail" name="email" type="email" required defaultValue={v("email")} />
        <Campo label="Telefone" name="telefone" defaultValue={v("telefone")} />
        <Campo label="Cidade" name="cidade" defaultValue={v("cidade")} />

        <p className="text-body-sm text-outline">
          Uma senha inicial será gerada automaticamente e enviada por e-mail ao aluno.
        </p>

        <SubmitButton>Criar Aluno</SubmitButton>
      </form>
    </div>
  );
}
