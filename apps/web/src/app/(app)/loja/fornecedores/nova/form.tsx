"use client";

import { useActionState } from "react";
import { SubmitButton, FormError } from "@/components/ui";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { criarFornecedor, atualizarFornecedor } from "../actions";

type Valores = Record<string, string>;

export function FornecedorForm({ valoresIniciais, fornecedorId }: { valoresIniciais?: Valores; fornecedorId?: string }) {
  const acao = fornecedorId ? atualizarFornecedor.bind(null, fornecedorId) : criarFornecedor;
  const [estado, formAction] = useActionState(acao as never, null);
  const v = (chave: string) => valoresIniciais?.[chave] ?? "";

  return (
    <form action={formAction} className="max-w-3xl space-y-gutter">
      <FormError />
      <SectionCard title="Dados do fornecedor">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Razão social *" name="razaoSocial" required defaultValue={v("razaoSocial")} />
          <Campo label="Nome fantasia" name="nomeFantasia" defaultValue={v("nomeFantasia")} />
          <Campo label="CNPJ" name="cnpj" defaultValue={v("cnpj")} />
          <Campo label="Telefone" name="telefone" defaultValue={v("telefone")} />
          <Campo label="WhatsApp" name="whatsapp" defaultValue={v("whatsapp")} />
          <Campo label="E-mail" name="email" defaultValue={v("email")} />
          <Campo label="Endereço" name="endereco" defaultValue={v("endereco")} />
          <Campo label="Cidade/Estado" name="cidade" defaultValue={v("cidade")} />
          <Campo label="Contato responsável" name="contatoResponsavel" defaultValue={v("contatoResponsavel")} />
          <Campo label="Condições de pagamento" name="condicoesPagamento" defaultValue={v("condicoesPagamento")} />
          <Campo label="Prazo médio de entrega" name="prazoMedioEntrega" defaultValue={v("prazoMedioEntrega")} />
          <Campo label="Observações" name="observacoes" defaultValue={v("observacoes")} />
        </div>
      </SectionCard>
      <SubmitButton>{fornecedorId ? "Salvar Alterações" : "Cadastrar Fornecedor"}</SubmitButton>
    </form>
  );
}
