"use client";

import { useActionState } from "react";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { criarContaBancaria } from "./actions";

export function NovaContaBancariaForm() {
  const [estado, formAction] = useActionState(criarContaBancaria, null);

  return (
    <SectionCard title="Nova Conta Bancária">
      <form action={formAction} className="space-y-4">
        <FormError erro={estado?.erro} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Apelido" name="apelido" required defaultValue={estado?.valores?.apelido} />
          <Campo label="Banco" name="banco" defaultValue={estado?.valores?.banco} />
          <Campo label="Agência" name="agencia" defaultValue={estado?.valores?.agencia} />
          <Campo label="Conta" name="conta" defaultValue={estado?.valores?.conta} />
          <Campo label="PIX" name="pix" defaultValue={estado?.valores?.pix} />
        </div>
        <SubmitButton>Adicionar Conta</SubmitButton>
      </form>
    </SectionCard>
  );
}
