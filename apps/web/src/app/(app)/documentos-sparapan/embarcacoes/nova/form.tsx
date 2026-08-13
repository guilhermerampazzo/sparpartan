"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "@/components/ui";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { criarEmbarcacaoSparapan } from "../../actions";

type Valores = Record<string, string>;

export function EmbarcacaoSparapanForm({
  valoresIniciais,
  aoSalvar,
}: {
  valoresIniciais?: Valores;
  aoSalvar?: (formData: FormData) => Promise<void>;
}) {
  const acao = aoSalvar ?? criarEmbarcacaoSparapan;
  const [estado, acaoForm] = useActionState(acao as never, null);
  const v = (chave: string) => valoresIniciais?.[chave] ?? "";

  return (
    <form action={acaoForm} className="space-y-gutter">
      <SectionCard title="Dados da embarcação">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo label="Nome *" name="nome" required defaultValue={v("nome")} />
          <Campo label="Número de inscrição" name="numeroInscricao" defaultValue={v("numeroInscricao")} />
          <Campo label="Tipo" name="tipo" defaultValue={v("tipo")} />
          <Campo label="Atividade" name="atividade" defaultValue={v("atividade")} />
          <Campo label="Ano de fabricação" name="anoFabricacao" defaultValue={v("anoFabricacao")} />
          <Campo label="Motor" name="motor" defaultValue={v("motor")} />
          <Campo label="Número de série" name="numeroSerie" defaultValue={v("numeroSerie")} />
          <div className="sm:col-span-2">
            <Campo label="Observações" name="observacoes" defaultValue={v("observacoes")} />
          </div>
        </div>
      </SectionCard>
      <SubmitButton>{valoresIniciais ? "Salvar Alterações" : "Salvar Embarcação"}</SubmitButton>
      <FormError />
    </form>
  );
}
