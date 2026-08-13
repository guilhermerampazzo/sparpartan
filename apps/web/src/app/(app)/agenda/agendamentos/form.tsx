"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, Button } from "@/components/ui";
import { salvarAgendamento, criarRepresentanteLegal } from "./actions";

export type InteressadoInicial = {
  nome: string;
  cpf: string | null;
  servicoSolicitado: string | null;
  observacao: string | null;
};

export type FormAgendamentoProps = {
  valoresIniciais?: {
    titulo?: string;
    dataHora?: string;
    tipo?: string;
    clienteId?: string;
    servicoId?: string;
    representanteLegalId?: string;
    local?: string;
    observacoes?: string;
    processoIds?: string[];
    interessados?: InteressadoInicial[];
  };
  listaClientes: { id: string; nome: string }[];
  listaServicos: { id: string; nome: string }[];
  listaRepresentantes: { id: string; nome: string }[];
  listaProcessos: { id: string; servicoNome: string }[];
};

const SELECT_CLASS =
  "rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary";

export function FormAgendamento({
  valoresIniciais,
  listaClientes,
  listaServicos,
  listaRepresentantes,
  listaProcessos,
}: FormAgendamentoProps) {
  const router = useRouter();
  const params = useParams<{ id?: string }>();
  const agendamentoId = params?.id;
  const [estado, formAction] = useActionState(salvarAgendamento, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  // Representantes criados inline na sessão — aparecem no select na hora.
  const [repExtras, setRepExtras] = useState<{ id: string; nome: string }[]>([]);
  const [repSelecionado, setRepSelecionado] = useState(valoresIniciais?.representanteLegalId ?? "");
  const [abrirNovoRep, setAbrirNovoRep] = useState(false);
  const [estadoRep, repAction] = useActionState(criarRepresentanteLegal, null);

  useEffect(() => {
    if (estadoRep && "representante" in estadoRep && estadoRep.representante) {
      setRepExtras((prev) => [...prev, estadoRep.representante!]);
      setRepSelecionado(estadoRep.representante!.id);
      setAbrirNovoRep(false);
    }
  }, [estadoRep]);

  const todasRepresentantes = useMemo(
    () => [...listaRepresentantes, ...repExtras],
    [listaRepresentantes, repExtras]
  );

  const clienteId = v("clienteId") || valoresIniciais?.clienteId || "";

  return (
    <form action={formAction} className="max-w-3xl space-y-6">
      {agendamentoId && <input type="hidden" name="id" value={agendamentoId} />}
      <FormError erro={estado?.erro} />

      <SectionCard title="1. Data, Hora e Cliente">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Data e Hora" name="dataHora" type="datetime-local" required defaultValue={v("dataHora") || valoresIniciais?.dataHora} />
          <CampoSelect
            label="Cliente"
            name="clienteId"
            required
            defaultValue={clienteId}
            options={[{ value: "", label: "Selecione..." }, ...listaClientes.map((c) => ({ value: c.id, label: c.nome }))]}
            onChange={(e) => {
              const id = e.target.value;
              if (id) router.replace(`?clienteId=${id}`);
            }}
          />
          <CampoSelect
            label="Tipo"
            name="tipo"
            defaultValue={v("tipo") || valoresIniciais?.tipo || "compromisso"}
            options={[
              { value: "compromisso", label: "Compromisso" },
              { value: "prova", label: "Prova" },
              { value: "vistoria", label: "Vistoria" },
            ]}
          />
          <Campo label="Local (ex: Capitania Fluvial)" name="local" defaultValue={v("local") || valoresIniciais?.local} />
        </div>
        <p className="mt-3 text-body-sm text-outline">
          Dica: se quiser, dê um título próprio — sem ele, o sistema gera automaticamente a partir do serviço e do cliente.
        </p>
        <div className="mt-3">
          <Campo label="Título (opcional)" name="titulo" defaultValue={v("titulo") || valoresIniciais?.titulo} />
        </div>
      </SectionCard>

      <SectionCard title="2. Serviço e Representante Legal">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <CampoSelect
            label="Serviço"
            name="servicoId"
            required
            defaultValue={v("servicoId") || valoresIniciais?.servicoId}
            options={[{ value: "", label: "Selecione..." }, ...listaServicos.map((s) => ({ value: s.id, label: s.nome }))]}
          />
          <div className="space-y-2">
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                Representante Legal *
              </span>
              <select
                name="representanteLegalId"
                required
                value={repSelecionado}
                onChange={(e) => setRepSelecionado(e.target.value)}
                className={SELECT_CLASS}
              >
                <option value="">Selecione...</option>
                {todasRepresentantes.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.nome}
                  </option>
                ))}
              </select>
            </label>
            {!abrirNovoRep ? (
              <button
                type="button"
                onClick={() => setAbrirNovoRep(true)}
                className="text-body-sm font-medium text-primary hover:underline"
              >
                + Novo representante legal
              </button>
            ) : (
              <div className="space-y-3 rounded-lg border border-dashed border-outline-variant p-4">
                <FormError erro={estadoRep && "erro" in estadoRep ? estadoRep.erro : undefined} />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <Campo label="Nome *" name="repNovoNome" required />
                  <Campo label="CPF" name="repNovoCpf" />
                  <div className="sm:col-span-2">
                    <label className="flex flex-col gap-1">
                      <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Observações</span>
                      <textarea
                        name="repNovoObservacoes"
                        rows={2}
                        className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                      />
                    </label>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" formAction={repAction} formNoValidate size="sm">
                    Salvar Representante
                  </Button>
                  <Button type="button" variant="outlined" size="sm" onClick={() => setAbrirNovoRep(false)}>
                    Cancelar
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title="3. Interessados (até 5)">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => {
            const it = valoresIniciais?.interessados?.[i - 1];
            return (
              <div key={i} className="rounded-lg border border-outline-variant p-3">
                <p className="mb-2 font-mono-caps text-[11px] uppercase tracking-wide text-outline">Interessado {i}</p>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
                  <Campo label="Nome" name={`interessado${i}Nome`} defaultValue={v(`interessado${i}Nome`) || it?.nome} />
                  <Campo label="CPF" name={`interessado${i}Cpf`} defaultValue={(v(`interessado${i}Cpf`) || it?.cpf) ?? ""} />
                  <Campo label="Serviço Solicitado" name={`interessado${i}Servico`} defaultValue={(v(`interessado${i}Servico`) || it?.servicoSolicitado) ?? ""} />
                  <Campo label="Observação" name={`interessado${i}Observacao`} defaultValue={(v(`interessado${i}Observacao`) || it?.observacao) ?? ""} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <SectionCard title="4. Processos no mesmo horário (1 a 5)">
        {clienteId ? (
          listaProcessos.length === 0 ? (
            <p className="text-body-sm text-outline">Este cliente ainda não tem processos cadastrados.</p>
          ) : (
            <>
              <p className="mb-3 text-body-sm text-outline">Selecione os processos que entram neste agendamento:</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {listaProcessos.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center gap-3 rounded-lg border border-outline-variant px-3 py-2 text-sm text-primary hover:bg-surface-container-low"
                  >
                    <input
                      type="checkbox"
                      name="processoId"
                      value={p.id}
                      defaultChecked={valoresIniciais?.processoIds?.includes(p.id)}
                      className="h-4 w-4 accent-[var(--color-primary)]"
                    />
                    <span className="truncate">{p.servicoNome}</span>
                  </label>
                ))}
              </div>
            </>
          )
        ) : (
          <p className="text-body-sm text-outline">Selecione o cliente acima para carregar os processos dele.</p>
        )}
      </SectionCard>

      <SectionCard title="5. Observação">
        <label className="flex flex-col gap-1">
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={v("observacoes") || valoresIniciais?.observacoes}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>
      </SectionCard>

      <SubmitButton>Salvar Agendamento</SubmitButton>
    </form>
  );
}
