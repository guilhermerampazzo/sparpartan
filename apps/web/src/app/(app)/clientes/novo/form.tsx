"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoCep, CampoCnpj, CampoOcr } from "@/components/ui";
import { criarCliente } from "../actions";

export function NovoClienteForm({
  listaServicos,
}: {
  listaServicos: { id: string; nome: string }[];
}) {
  const [estado, formAction] = useActionState(criarCliente, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Cliente</h1>

      <form
        action={formAction}
        className="max-w-3xl space-y-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
      >
        <FormError erro={estado?.erro} />

        <CampoOcr camposDestino={{ nome: "nome", cpfCnpj: "cpfCnpj", rg: "rg", dataNascimento: "dataNascimento" }} />

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

        <label className="flex flex-col gap-1">
          <span className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">Observações</span>
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={v("observacoes")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
          />
        </label>

        <SectionCard title="Embarcação e serviço solicitado (opcional)">
          <p className="mb-4 text-body-sm text-outline">
            Já aproveite o cadastro para vincular a embarcação e/ou o serviço que o cliente está
            solicitando — o sistema cria o processo e as pendências de conferência automaticamente.
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nome da embarcação" name="embarcacaoNome" defaultValue={v("embarcacaoNome")} />
            <Campo label="Tipo (lancha, jetski, veleiro...)" name="embarcacaoTipo" defaultValue={v("embarcacaoTipo")} />
            <Campo
              label="Nº de inscrição (se já tiver)"
              name="embarcacaoNumeroInscricao"
              defaultValue={v("embarcacaoNumeroInscricao")}
            />
            <CampoSelect
              label="Classe"
              name="embarcacaoClasse"
              defaultValue={String(v("embarcacaoClasse") || "esporte_recreio")}
              options={[
                { value: "esporte_recreio", label: "Esporte e Recreio" },
                { value: "comercial", label: "Comercial" },
              ]}
            />
          </div>
          <div className="mt-4">
            <CampoSelect
              label="Serviço solicitado"
              name="servicoSolicitadoId"
              defaultValue={String(v("servicoSolicitadoId"))}
              options={[
                { value: "", label: "Nenhum por enquanto" },
                ...listaServicos.map((s) => ({ value: s.id, label: s.nome })),
              ]}
            />
          </div>
        </SectionCard>

        <SubmitButton>Salvar Cliente</SubmitButton>
      </form>
    </div>
  );
}
