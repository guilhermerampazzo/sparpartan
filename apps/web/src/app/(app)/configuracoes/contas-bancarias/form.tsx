"use client";

import { useActionState } from "react";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { criarContaBancaria } from "./actions";
import type { EstadoForm } from "@/lib/validacao";

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

export function EditarContaBancariaForm({
  conta,
  action,
}: {
  conta: { apelido: string; banco: string | null; agencia: string | null; conta: string | null; pix: string | null };
  action: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
}) {
  const [estado, formAction] = useActionState(action, null);

  return (
    <SectionCard title="Dados da Conta">
      <form action={formAction} className="space-y-4">
        <FormError erro={estado?.erro} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Apelido" name="apelido" required defaultValue={conta.apelido} />
          <Campo label="Banco" name="banco" defaultValue={conta.banco ?? ""} />
          <Campo label="Agência" name="agencia" defaultValue={conta.agencia ?? ""} />
          <Campo label="Conta" name="conta" defaultValue={conta.conta ?? ""} />
          <Campo label="PIX" name="pix" defaultValue={conta.pix ?? ""} />
        </div>
        <div className="flex gap-3">
          <SubmitButton>Salvar Alterações</SubmitButton>
        </div>
      </form>
    </SectionCard>
  );
}
