"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { criarObra } from "../actions";
import type { EstadoForm } from "@/lib/validacao";

type Engenheiro = {
  id: string;
  nomeCompleto: string;
  cpf: string | null;
  crea: string | null;
  tituloProfissional: string | null;
};

export function NovaObraForm({
  listaClientes,
  listaEngenheiros,
  obraInicial,
  action = criarObra,
  submitLabel = "Salvar Obra",
}: {
  listaClientes: { id: string; nome: string }[];
  listaEngenheiros: Engenheiro[];
  obraInicial?: Record<string, unknown>;
  action?: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  submitLabel?: string;
}) {
  const [estado, formAction] = useActionState(action, null);
  const v = (nome: string): string | number =>
    (estado?.valores?.[nome] as string | undefined) ??
    ((obraInicial?.[nome] as string | number | null | undefined) ?? "");

  return (
    <form action={formAction} className="max-w-4xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Identificação">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <CampoSelect
            label="Proprietário (Cliente)"
            name="clienteId"
            required
            defaultValue={String(v("clienteId"))}
            options={[
              { value: "", label: "Selecione..." },
              ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />
          <Campo label="Título da Obra" name="titulo" defaultValue={v("titulo")} />
          <Campo label="ID da Obra" name="idObra" defaultValue={v("idObra")} />
          <Campo label="Tipo de Obra" name="tipoObra" defaultValue={v("tipoObra")} />
          <Campo label="Código do Item da Obra" name="itemObraCodigo" defaultValue={v("itemObraCodigo")} />
          <Campo label="NORMAM de Uso" name="normamDeUso" defaultValue={v("normamDeUso")} />
          <Campo label="CP/DL/AG" name="cpDlAg" defaultValue={v("cpDlAg")} />
        </div>
        <label className="mt-4 flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Descrição da Obra
          </span>
          <textarea
            name="descricaoObra"
            rows={3}
            defaultValue={v("descricaoObra")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>
      </SectionCard>

      <SectionCard title="Localização">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="Endereço" name="endereco" defaultValue={v("endereco")} />
          <Campo label="Rio Localizado" name="rioLocalizado" defaultValue={v("rioLocalizado")} />
          <Campo label="Distância do Rio (km)" name="distanciaRioKm" type="number" defaultValue={v("distanciaRioKm")} />
          <Campo label="Área de Navegação" name="areaNavegacao" defaultValue={v("areaNavegacao")} />
          <Campo label="Atividade" name="atividade" defaultValue={v("atividade")} />
        </div>
        <div className="mt-4">
          <p className="mb-2 font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Coordenadas (Ponto A/B/C/D)
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <Campo label="Ponto A" name="pontoA" defaultValue={v("pontoA")} />
            <Campo label="Ponto B" name="pontoB" defaultValue={v("pontoB")} />
            <Campo label="Ponto C" name="pontoC" defaultValue={v("pontoC")} />
            <Campo label="Ponto D" name="pontoD" defaultValue={v("pontoD")} />
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Dimensões e Estrutura">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="Comprimento (m)" name="comprimento" type="number" defaultValue={v("comprimento")} />
          <Campo label="Largura (m)" name="largura" type="number" defaultValue={v("largura")} />
          <Campo label="Área Construída (m²)" name="areaConstruida" type="number" defaultValue={v("areaConstruida")} />
          <Campo label="Apoiado Sobre" name="apoiadoSobre" defaultValue={v("apoiadoSobre")} />
          <Campo label="Estrutura de Cobertura" name="estruturaCober" defaultValue={v("estruturaCober")} />
          <Campo label="Material da Estrutura" name="matEstrutura" defaultValue={v("matEstrutura")} />
          <Campo label="Material das Paredes" name="matParedes" defaultValue={v("matParedes")} />
          <Campo label="Material do Piso" name="matPiso" defaultValue={v("matPiso")} />
          <Campo label="Material da Cobertura" name="matCobertura" defaultValue={v("matCobertura")} />
          <Campo label="Fonte de Energia" name="fontEnergia" defaultValue={v("fontEnergia")} />
          <CampoSelect
            label="Tem Banheiro?"
            name="banheiroSn"
            defaultValue={String(v("banheiroSn"))}
            options={[
              { value: "", label: "—" },
              { value: "sim", label: "Sim" },
              { value: "nao", label: "Não" },
            ]}
          />
          <Campo label="Pia ou Outros" name="piaOuOutros" defaultValue={v("piaOuOutros")} />
        </div>
        <label className="mt-4 flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Lista de Materiais de Construção e Dimensões
          </span>
          <textarea
            name="listaMatConstrucaoDimensoes"
            rows={3}
            defaultValue={v("listaMatConstrucaoDimensoes")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>
      </SectionCard>

      <SectionCard title="Calados, Deslocamento e Carga">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="Calado Carregado" name="caladoCar" type="number" defaultValue={v("caladoCar")} />
          <Campo label="Calado Leve" name="caladoLeve" type="number" defaultValue={v("caladoLeve")} />
          <Campo label="Deslocamento Carregado" name="deslCar" type="number" defaultValue={v("deslCar")} />
          <Campo label="Deslocamento Leve" name="deslLeve" type="number" defaultValue={v("deslLeve")} />
          <Campo label="Peso Adicional" name="pesoAdicional" type="number" defaultValue={v("pesoAdicional")} />
          <Campo label="Carga Suportada" name="cargaSuportada" type="number" defaultValue={v("cargaSuportada")} />
          <Campo label="Lotação Máxima" name="lotacaoMax" type="number" defaultValue={v("lotacaoMax")} />
        </div>
      </SectionCard>

      <SectionCard title="Salvatagem e Flutuação">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Campo label="Coletes" name="coletes" type="number" defaultValue={v("coletes")} />
          <Campo label="Boias" name="boias" type="number" defaultValue={v("boias")} />
          <Campo label="Material dos Tambores" name="matTambores" defaultValue={v("matTambores")} />
          <Campo label="Quantidade de Tambores" name="qntTambores" type="number" defaultValue={v("qntTambores")} />
          <Campo label="Volume dos Tambores" name="volumeTambores" type="number" defaultValue={v("volumeTambores")} />
        </div>
      </SectionCard>

      <SectionCard title="Responsável Técnico">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoSelect
            label="Engenheiro Responsável"
            name="engenheiroId"
            defaultValue={String(v("engenheiroId"))}
            options={[
              { value: "", label: "Selecione..." },
              ...listaEngenheiros.map((e) => ({
                value: e.id,
                label: `${e.nomeCompleto}${e.crea ? ` — CREA ${e.crea}` : ""}`,
              })),
            ]}
          />
        </div>
        <p className="mt-3 text-body-sm text-outline">
          Não encontrou o engenheiro?{" "}
          <Link href="/obras/engenheiros" className="text-primary hover:underline" target="_blank">
            Cadastrar novo engenheiro
          </Link>
          .
        </p>
      </SectionCard>

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}
