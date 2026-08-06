"use client";

import { Campo, SubmitButton } from "@/components/ui";

export function AlunoEditForm({
  action,
  telefone,
  cidade,
  ativo,
}: {
  action: (formData: FormData) => Promise<void>;
  telefone: string;
  cidade: string;
  ativo: boolean;
}) {
  return (
    <form action={action} className="space-y-4">
      <Campo label="Telefone" name="telefone" defaultValue={telefone} />
      <Campo label="Cidade" name="cidade" defaultValue={cidade} />
      <label className="flex items-center gap-2 text-body-sm text-primary">
        <input type="checkbox" name="ativo" defaultChecked={ativo} className="h-4 w-4" />
        Aluno ativo
      </label>
      <SubmitButton>Salvar Alterações</SubmitButton>
    </form>
  );
}
