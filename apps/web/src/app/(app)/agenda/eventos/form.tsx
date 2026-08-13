"use client";

import { useActionState, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { salvarEvento } from "./actions";
import { ENTIDADES_EVENTO } from "@/lib/agenda-entidades";

export type VinculoInicial = { entidade: string; entidadeId: string; rotulo?: string };

export type FormEventoProps = {
  valoresIniciais?: {
    titulo?: string;
    descricao?: string;
    data?: string;
    prazoSolucao?: string;
    responsavelId?: string;
    status?: string;
    observacoes?: string;
    vinculos?: VinculoInicial[];
  };
  listaUsuarios: { id: string; nome: string }[];
};

type ItemVinculo = { id: string; rotulo: string };

const SELECT_CLASS =
  "rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary";

function LinhaVinculo({ indice, inicial }: { indice: number; inicial?: VinculoInicial }) {
  const [entidade, setEntidade] = useState(inicial?.entidade ?? "");
  const [itemSelecionado, setItemSelecionado] = useState(inicial?.entidadeId ?? "");
  const [itens, setItens] = useState<ItemVinculo[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!entidade) {
      setItens([]);
      setItemSelecionado("");
      return;
    }
    let ativo = true;
    setCarregando(true);
    fetch(`/api/agenda/eventos/itens?entidade=${encodeURIComponent(entidade)}`)
      .then((r) => (r.ok ? r.json() : { itens: [] }))
      .then((d) => {
        if (ativo) setItens(d.itens ?? []);
      })
      .finally(() => {
        if (ativo) setCarregando(false);
      });
    return () => {
      ativo = false;
    };
  }, [entidade]);

  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-3 sm:grid-cols-2">
      <label className="flex flex-col gap-1">
        <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
          Vínculo {indice} — Tipo
        </span>
        <select
          name={`vinculoEntidade${indice}`}
          value={entidade}
          onChange={(e) => {
            setEntidade(e.target.value);
            setItemSelecionado("");
            setItens([]);
          }}
          className={SELECT_CLASS}
        >
          <option value="">Nenhum</option>
          {ENTIDADES_EVENTO.map((e) => (
            <option key={e.valor} value={e.valor}>
              {e.rotulo}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
          Vínculo {indice} — Item
        </span>
        <select
          name={`vinculoId${indice}`}
          value={itemSelecionado}
          onChange={(e) => setItemSelecionado(e.target.value)}
          className={SELECT_CLASS}
        >
          <option value="">
            {carregando ? "Carregando..." : entidade ? "Selecione..." : "Escolha o tipo acima"}
          </option>
          {itens.map((i) => (
            <option key={i.id} value={i.id}>
              {i.rotulo}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
}

export function FormEvento({ valoresIniciais, listaUsuarios }: FormEventoProps) {
  const params = useParams<{ id?: string }>();
  const eventoId = params?.id;
  const [estado, formAction] = useActionState(salvarEvento, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {eventoId && <input type="hidden" name="id" value={eventoId} />}
      <FormError erro={estado?.erro} />

      <SectionCard title="1. O que precisa ser feito">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Campo label="Título" name="titulo" required defaultValue={v("titulo") || valoresIniciais?.titulo} />
            <p className="mt-1 text-body-sm text-outline">
              Ex.: Verificar documento pendente do cliente X até dia 20.
            </p>
          </div>
          <div className="sm:col-span-2">
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Descrição</span>
              <textarea
                name="descricao"
                rows={3}
                defaultValue={v("descricao") || valoresIniciais?.descricao}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              />
            </label>
          </div>
          <Campo label="Data" name="data" type="date" required defaultValue={v("data") || valoresIniciais?.data} />
          <Campo label="Prazo para solução" name="prazoSolucao" type="date" defaultValue={v("prazoSolucao") || valoresIniciais?.prazoSolucao} />
          <CampoSelect
            label="Responsável"
            name="responsavelId"
            defaultValue={v("responsavelId") || valoresIniciais?.responsavelId}
            options={[{ value: "", label: "Sem responsável" }, ...listaUsuarios.map((u) => ({ value: u.id, label: u.nome }))]}
          />
          <CampoSelect
            label="Status"
            name="status"
            defaultValue={v("status") || valoresIniciais?.status || "pendente"}
            options={[
              { value: "pendente", label: "Pendente" },
              { value: "em_andamento", label: "Em andamento" },
              { value: "concluido", label: "Concluído" },
              { value: "arquivado", label: "Arquivado" },
            ]}
          />
        </div>
      </SectionCard>

      <SectionCard title="2. Vínculos com o sistema (opcional, até 3)">
        <p className="mb-3 text-body-sm text-outline">
          Vincule este evento a clientes, processos, embarcações, orçamentos, documentos, serviços, obras, taxas ou alunos.
        </p>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <LinhaVinculo key={i} indice={i} inicial={valoresIniciais?.vinculos?.[i - 1]} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="3. Observação">
        <textarea
          name="observacoes"
          rows={3}
          defaultValue={v("observacoes") || valoresIniciais?.observacoes}
          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        />
      </SectionCard>

      <SubmitButton>Salvar Evento</SubmitButton>
    </form>
  );
}
