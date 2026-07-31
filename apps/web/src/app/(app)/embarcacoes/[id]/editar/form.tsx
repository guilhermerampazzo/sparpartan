"use client";

import { useActionState, useState } from "react";
import { Campo, CampoSelect, CampoComboLivre, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { atualizarEmbarcacao } from "../../actions";
import type { EstadoForm } from "@/lib/validacao";

const ATIVIDADES_COMERCIAIS = [
  "Transporte de carga",
  "Transporte de passageiros",
  "Transporte de carga e passageiros",
  "Pesca",
  "Extração de minérios",
  "Captação de água",
  "Roll-on Roll-off",
];

type Embarcacao = {
  id: string;
  clienteId: string;
  nome: string;
  nomeAnterior: string | null;
  numeroInscricao: string | null;
  tipo: string | null;
  atividade: string | null;
  areaNavegacao: string | null;
  classe: "esporte_recreio" | "comercial";
  atividadeComercial: string | null;
  comprimento: string | null;
  boca: string | null;
  pontal: string | null;
  caladoMax: string | null;
  arqueacaoBruta: string | null;
  arqueacaoLiquida: string | null;
  pbt: string | null;
  lpp: string | null;
  tripulantes: number | null;
  passageiros: number | null;
  lotacao: number | null;
  ano: number | null;
  numeroCasco: string | null;
  materialCasco: string | null;
  construtor: string | null;
  cor: string | null;
  tipoPropulsao: string | null;
  potenciaMotor: string | null;
  numeroSerieMotor: string | null;
};

export function EditarEmbarcacaoForm({
  embarcacao,
  listaClientes,
}: {
  embarcacao: Embarcacao;
  listaClientes: { id: string; nome: string }[];
}) {
  const atualizarComId = atualizarEmbarcacao.bind(null, embarcacao.id);
  const [estado, formAction] = useActionState<EstadoForm, FormData>(atualizarComId, null);
  const v = (nome: keyof Embarcacao): string | number =>
    estado?.valores?.[nome] ?? ((embarcacao[nome] ?? "") as string | number);
  const [classe, setClasse] = useState(String(v("classe")));

  return (
    <form action={formAction} className="max-w-4xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Dados da Embarcação">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoSelect
            label="Cliente (Proprietário)"
            name="clienteId"
            required
            defaultValue={String(v("clienteId"))}
            options={listaClientes.map((c) => ({ value: c.id, label: c.nome }))}
          />
          <Campo label="Nome" name="nome" required defaultValue={v("nome")} />
          <CampoSelect
            label="Classe"
            name="classe"
            defaultValue={classe}
            onChange={(e) => setClasse(e.target.value)}
            options={[
              { value: "esporte_recreio", label: "Esporte e Recreio" },
              { value: "comercial", label: "Comercial" },
            ]}
          />
          {classe === "comercial" && (
            <CampoComboLivre
              label="Atividade Específica"
              name="atividadeComercial"
              defaultValue={String(v("atividadeComercial"))}
              options={ATIVIDADES_COMERCIAIS}
            />
          )}
          <Campo label="Nome Anterior" name="nomeAnterior" defaultValue={v("nomeAnterior")} />
          <Campo label="Número de Inscrição" name="numeroInscricao" defaultValue={v("numeroInscricao")} />
          <Campo label="Tipo" name="tipo" defaultValue={v("tipo")} />
          <Campo label="Atividade" name="atividade" defaultValue={v("atividade")} />
          <Campo label="Área de Navegação" name="areaNavegacao" defaultValue={v("areaNavegacao")} />
          <Campo label="Ano" name="ano" type="number" defaultValue={v("ano")} />
          <Campo label="Comprimento (m)" name="comprimento" type="number" defaultValue={v("comprimento")} />
          <Campo label="Boca (m)" name="boca" type="number" defaultValue={v("boca")} />
          <Campo label="Pontal (m)" name="pontal" type="number" defaultValue={v("pontal")} />
          <Campo label="Calado Máx (m)" name="caladoMax" type="number" defaultValue={v("caladoMax")} />
          <Campo label="Arqueação Bruta" name="arqueacaoBruta" type="number" defaultValue={v("arqueacaoBruta")} />
          <Campo label="Arqueação Líquida" name="arqueacaoLiquida" type="number" defaultValue={v("arqueacaoLiquida")} />
          <Campo label="PBT" name="pbt" type="number" defaultValue={v("pbt")} />
          <Campo label="LPP" name="lpp" type="number" defaultValue={v("lpp")} />
          <Campo label="Tripulantes" name="tripulantes" type="number" defaultValue={v("tripulantes")} />
          <Campo label="Passageiros" name="passageiros" type="number" defaultValue={v("passageiros")} />
          <Campo label="Lotação" name="lotacao" type="number" defaultValue={v("lotacao")} />
          <Campo label="Número do Casco" name="numeroCasco" defaultValue={v("numeroCasco")} />
          <Campo label="Material do Casco" name="materialCasco" defaultValue={v("materialCasco")} />
          <Campo label="Construtor" name="construtor" defaultValue={v("construtor")} />
          <Campo label="Cor" name="cor" defaultValue={v("cor")} />
          <Campo label="Marca do Motor" name="tipoPropulsao" defaultValue={v("tipoPropulsao")} />
          <Campo label="Potência (HP)" name="potenciaMotor" type="number" defaultValue={v("potenciaMotor")} />
          <Campo label="Número de Série do Motor" name="numeroSerieMotor" defaultValue={v("numeroSerieMotor")} />
        </div>
      </SectionCard>

      <SubmitButton>Salvar Alterações</SubmitButton>
    </form>
  );
}
