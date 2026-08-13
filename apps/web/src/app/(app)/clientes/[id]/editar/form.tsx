"use client";

import { useActionState } from "react";
import { Campo, CampoSelect } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoCep, CampoCnpj } from "@/components/ui";
import { atualizarCliente } from "../../actions";
import type { EstadoForm } from "@/lib/validacao";

type Cliente = {
  id: string;
  nome: string;
  tipo: string;
  cpfCnpj: string;
  rg: string | null;
  orgaoEmissor: string | null;
  dataEmissaoRg: string | null;
  dataNascimento: string | null;
  email: string | null;
  telefone: string | null;
  celular: string | null;
  cep: string | null;
  rua: string | null;
  numero: string | null;
  complemento: string | null;
  bairro: string | null;
  cidade: string | null;
  uf: string | null;
  indicadoPor: string | null;
  senhaDpem: string | null;
  observacoes: string | null;
};

export function EditarClienteForm({ cliente }: { cliente: Cliente }) {
  const atualizarComId = atualizarCliente.bind(null, cliente.id);
  const [estado, formAction] = useActionState<EstadoForm, FormData>(atualizarComId, null);
  const v = (nome: keyof Cliente) => estado?.valores?.[nome] ?? (cliente[nome] ?? "");

  return (
    <form
      action={formAction}
      className="max-w-3xl space-y-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
    >
      <FormError erro={estado?.erro} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Nome" name="nome" required defaultValue={v("nome")} />
        <CampoSelect
          label="Tipo"
          name="tipo"
          defaultValue={v("tipo") || "pessoa_fisica"}
          options={[
            { value: "pessoa_fisica", label: "Pessoa Física" },
            { value: "pessoa_juridica", label: "Pessoa Jurídica" },
          ]}
        />
        <CampoCnpj
          label="CPF/CNPJ"
          name="cpfCnpj"
          required
          defaultValue={v("cpfCnpj")}
          camposEmpresa={{ nome: "nome", cep: "cep", rua: "rua", bairro: "bairro", cidade: "cidade", uf: "uf" }}
        />
        <Campo label="RG" name="rg" defaultValue={v("rg")} />
        <Campo label="Órgão Emissor" name="orgaoEmissor" defaultValue={v("orgaoEmissor")} />
        <Campo
          label="Data de Emissão do Documento"
          name="dataEmissaoRg"
          type="date"
          defaultValue={v("dataEmissaoRg")}
        />
        <Campo label="Data de Nascimento" name="dataNascimento" type="date" defaultValue={v("dataNascimento")} />
        <Campo label="E-mail" name="email" type="email" defaultValue={v("email")} />
        <Campo label="Telefone" name="telefone" defaultValue={v("telefone")} />
        <Campo label="Celular" name="celular" defaultValue={v("celular")} />
      </div>

      <div>
        <p className="mb-3 font-mono-caps text-label-sm uppercase tracking-wide text-outline">Endereço</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CampoCep
            name="cep"
            defaultValue={v("cep")}
            camposEndereco={{ rua: "rua", bairro: "bairro", cidade: "cidade", uf: "uf" }}
          />
          <Campo label="Rua" name="rua" defaultValue={v("rua")} />
          <Campo label="Número" name="numero" defaultValue={v("numero")} />
          <Campo label="Complemento" name="complemento" defaultValue={v("complemento")} />
          <Campo label="Bairro" name="bairro" defaultValue={v("bairro")} />
          <Campo label="Cidade" name="cidade" defaultValue={v("cidade")} />
          <Campo label="UF" name="uf" defaultValue={v("uf")} />
        </div>
      </div>

      <Campo label="Indicado por" name="indicadoPor" defaultValue={v("indicadoPor")} />
      <Campo label="Senha DPEM (se o cliente possui embarcação)" name="senhaDpem" defaultValue={v("senhaDpem")} />

      <label className="flex flex-col gap-1">
        <span className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">Observações</span>
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={v("observacoes")}
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
        />
      </label>

      <SubmitButton>Salvar Alterações</SubmitButton>
    </form>
  );
}
