"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { criarEvento } from "../actions";

export function NovoEventoForm({
  clienteId,
  listaProcessos,
}: {
  clienteId: string;
  listaProcessos: { id: string; servicoNome: string }[];
}) {
  const [estado, formAction] = useActionState(criarEvento, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <input type="hidden" name="clienteId" value={clienteId} />
      <FormError erro={estado?.erro} />

      <SectionCard title="2. Dados do Evento">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Título" name="titulo" required defaultValue={v("titulo")} />
          <Campo label="Data e Hora" name="dataHora" type="datetime-local" required defaultValue={v("dataHora")} />
          <CampoSelect
            label="Tipo"
            name="tipo"
            defaultValue={v("tipo") || "compromisso"}
            options={[
              { value: "compromisso", label: "Compromisso" },
              { value: "prova", label: "Prova" },
              { value: "vistoria", label: "Vistoria" },
              { value: "vencimento", label: "Vencimento" },
            ]}
          />
          <CampoSelect
            label="Processo (opcional)"
            name="processoId"
            defaultValue={v("processoId")}
            options={[
              {
                value: "",
                label: clienteId ? "Nenhum" : "Selecione um cliente acima primeiro",
              },
              ...listaProcessos.map((p) => ({ value: p.id, label: p.servicoNome })),
            ]}
          />
          <Campo label="Local (ex: Capitania Fluvial)" name="local" defaultValue={v("local")} />
          <Campo label="Representante Legal" name="representanteLegal" defaultValue={v("representanteLegal")} />
        </div>
        <label className="mt-4 flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Observações
          </span>
          <textarea
            name="observacoes"
            rows={3}
            defaultValue={v("observacoes")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>
      </SectionCard>

      <SectionCard title="3. Interessados e Serviços (opcional, até 5)">
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Campo label={`Interessado ${i} — Nome`} name={`interessado${i}Nome`} />
              <Campo label={`Interessado ${i} — CPF`} name={`interessado${i}Cpf`} />
              <Campo label={`Interessado ${i} — Serviço Solicitado`} name={`interessado${i}Servico`} />
            </div>
          ))}
        </div>
      </SectionCard>

      <SubmitButton>Criar Evento</SubmitButton>
    </form>
  );
}
