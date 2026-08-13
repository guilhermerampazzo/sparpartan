"use client";

import { Link2 } from "lucide-react";
import { SubmitButton, FormError } from "@/components/ui";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { criarEmpresa, atualizarEmpresa } from "../actions";

type ClienteOpcao = { id: string; nome: string; cpfCnpj: string | null };

export function EmpresaForm({
  listaClientes,
  valoresIniciais,
  empresaId,
}: {
  listaClientes: ClienteOpcao[];
  valoresIniciais?: Record<string, string>;
  empresaId?: string;
}) {
  const v = (chave: string) => valoresIniciais?.[chave] ?? "";
  const acao = empresaId ? atualizarEmpresa.bind(null, empresaId) : criarEmpresa;

  return (
    <form action={acao} className="space-y-gutter">
      <SectionCard title="Dados da empresa">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Campo label="Razão social *" name="razaoSocial" required defaultValue={v("razaoSocial")} />
          <Campo label="Nome fantasia" name="nomeFantasia" defaultValue={v("nomeFantasia")} />
          <Campo label="CNPJ" name="cnpj" defaultValue={v("cnpj")} />
          <Campo label="Inscrição estadual" name="inscricaoEstadual" defaultValue={v("inscricaoEstadual")} />
          <Campo label="Telefone" name="telefone" defaultValue={v("telefone")} />
          <Campo label="E-mail" name="email" defaultValue={v("email")} />
          <div className="sm:col-span-2 lg:col-span-3">
            <Campo label="Endereço" name="endereco" defaultValue={v("endereco")} />
          </div>
          <Campo label="Responsável" name="responsavel" defaultValue={v("responsavel")} />
          <div className="sm:col-span-2">
            <Campo label="Observações" name="observacoes" defaultValue={v("observacoes")} />
          </div>
          {valoresIniciais && (
            <CampoSelect
              label="Status"
              name="status"
              defaultValue={v("status") || "ativa"}
              options={[
                { value: "ativa", label: "Ativa" },
                { value: "inativa", label: "Inativa" },
              ]}
            />
          )}
        </div>
      </SectionCard>

      {!valoresIniciais && (
        <SectionCard title="Vincular cliente existente (opcional)">
          <p className="mb-3 flex items-center gap-1 text-body-sm text-outline">
            <Link2 size={12} /> Se a empresa já existe no cadastro principal, selecione para evitar duplicidade.
          </p>
          <CampoSelect
            label="Cliente"
            name="clienteId"
            options={[
              { value: "", label: "— não vincular —" },
              ...listaClientes.map((c) => ({ value: c.id, label: `${c.nome}${c.cpfCnpj ? ` (${c.cpfCnpj})` : ""}` })),
            ]}
          />
        </SectionCard>
      )}

      <SubmitButton>{valoresIniciais ? "Salvar Alterações" : "Cadastrar Empresa"}</SubmitButton>
      <FormError />
    </form>
  );
}
