"use client";

import { useState } from "react";
import { useActionState } from "react";
import { Receipt, GraduationCap, Ship, Anchor, Hammer } from "lucide-react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoCep, CampoCnpj, CampoOcr } from "@/components/ui";
import { criarCliente } from "../actions";
import {
  OPCOES_SERVICO_NOVO_CLIENTE,
  type OpcaoServicoNovoCliente,
} from "@/lib/novo-cliente-opcoes";

const ICONES_OPCAO: Record<OpcaoServicoNovoCliente, typeof Receipt> = {
  orcamento: Receipt,
  escola: GraduationCap,
  esporte_recreio: Ship,
  comercial: Anchor,
  obras: Hammer,
};

const DESCRICAO_OPCAO: Record<OpcaoServicoNovoCliente, string> = {
  orcamento: "Cliente quer um orçamento — sem processo por enquanto.",
  escola: "Cria os processos de Arrais Amador e Motonauta automaticamente.",
  esporte_recreio: "Cadastra a embarcação e cria o processo de inscrição.",
  comercial: "Cadastra a embarcação comercial e cria o processo de inscrição.",
  obras: "Cria o processo do serviço de obras náuticas.",
};

export function NovoClienteForm() {
  const [estado, formAction] = useActionState(criarCliente, null);
  const [tipoServico, setTipoServico] = useState<OpcaoServicoNovoCliente | "">("");
  const v = (nome: string) => estado?.valores?.[nome] ?? "";
  const mostraEmbarcacao = tipoServico === "esporte_recreio" || tipoServico === "comercial";

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

        <SectionCard title="O que o cliente está procurando?">
          <p className="mb-4 text-body-sm text-outline">
            Escolha o tipo de serviço — o sistema cria o cliente e os processos necessários automaticamente,
            sem cadastrar a mesma informação duas vezes.
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {OPCOES_SERVICO_NOVO_CLIENTE.map((opcao) => {
              const Icone = ICONES_OPCAO[opcao.valor];
              const selecionada = tipoServico === opcao.valor;
              return (
                <button
                  key={opcao.valor}
                  type="button"
                  onClick={() => setTipoServico(selecionada ? "" : opcao.valor)}
                  className={`flex items-start gap-3 rounded-lg border p-3 text-left transition-colors ${
                    selecionada
                      ? "border-primary bg-primary/10"
                      : "border-outline-variant bg-surface hover:border-primary/50"
                  }`}
                >
                  <Icone size={20} className={selecionada ? "text-primary" : "text-outline"} />
                  <span>
                    <span className={`block text-body-sm font-medium ${selecionada ? "text-primary" : ""}`}>
                      {opcao.rotulo}
                    </span>
                    <span className="block text-body-sm text-outline">{DESCRICAO_OPCAO[opcao.valor]}</span>
                  </span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="tipoServico" value={tipoServico} />
        </SectionCard>

        {mostraEmbarcacao && (
          <SectionCard title={`Dados da embarcação (${tipoServico === "comercial" ? "comercial" : "esporte e recreio"})`}>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Campo label="Nome da embarcação" name="embarcacaoNome" required defaultValue={v("embarcacaoNome")} />
              <Campo label="Tipo (lancha, jetski, veleiro...)" name="embarcacaoTipo" defaultValue={v("embarcacaoTipo")} />
              <Campo
                label="Nº de inscrição (se já tiver)"
                name="embarcacaoNumeroInscricao"
                defaultValue={v("embarcacaoNumeroInscricao")}
              />
            </div>
          </SectionCard>
        )}

        <Campo
          label="Senha DPEM (se o cliente possui embarcação)"
          name="senhaDpem"
          defaultValue={v("senhaDpem")}
        />

        <label className="flex flex-col gap-1">
          <span className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">Observações</span>
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={v("observacoes")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
          />
        </label>

        <SubmitButton>Salvar Cliente</SubmitButton>
      </form>
    </div>
  );
}
