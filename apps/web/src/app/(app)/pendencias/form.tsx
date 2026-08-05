"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, Button } from "@/components/ui";
import { PENDENCIA_CATEGORIAS, PENDENCIA_PRIORIDADES } from "@/lib/pendencias";
import type { EstadoForm } from "@/lib/validacao";
import { criarPendenciaManual } from "./actions";

export function NovaPendenciaForm({
  listaClientes,
  listaResponsaveis,
  pendenciaInicial,
  action = criarPendenciaManual,
  submitLabel = "Adicionar Pendência",
}: {
  listaClientes: { id: string; nome: string }[];
  listaResponsaveis: string[];
  pendenciaInicial?: Record<string, unknown>;
  action?: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  submitLabel?: string;
}) {
  const [estado, formAction] = useActionState(action, null);
  const v = (nome: string): string | number =>
    (estado?.valores?.[nome] as string | undefined) ??
    ((pendenciaInicial?.[nome] as string | number | null | undefined) ?? "");

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Dados da Pendência">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
              Descrição *
            </span>
            <input
              name="descricao"
              required
              defaultValue={v("descricao")}
              placeholder="Ex.: Protocolar processo NORMAM-211"
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
            />
          </label>

          <CampoSelect
            label="Categoria"
            name="categoria"
            defaultValue={String(v("categoria") || "processos")}
            options={PENDENCIA_CATEGORIAS.map((c) => ({ value: c.value, label: c.label }))}
          />

          <CampoSelect
            label="Prioridade"
            name="prioridade"
            defaultValue={String(v("prioridade") || "media")}
            options={PENDENCIA_PRIORIDADES.map((p) => ({ value: p.value, label: p.label }))}
          />

          <Campo label="Data *" name="data" type="date" required defaultValue={v("data")} />
          <Campo label="Horário (opcional)" name="horario" type="time" defaultValue={v("horario")} />

          <CampoSelect
            label="Cliente (quando houver)"
            name="clienteId"
            defaultValue={String(v("clienteId"))}
            options={[
              { value: "", label: "—" },
              ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />

          <label className="flex flex-col gap-1">
            <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
              Responsável
            </span>
            <input
              name="responsavel"
              list="responsaveis-sugestoes"
              defaultValue={v("responsavel")}
              placeholder="Digite ou selecione..."
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
            />
            <datalist id="responsaveis-sugestoes">
              {listaResponsaveis.map((r) => (
                <option key={r} value={r} />
              ))}
            </datalist>
          </label>

          <label className="flex flex-col gap-1 sm:col-span-2">
            <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
              Observações
            </span>
            <textarea
              name="observacoes"
              rows={2}
              defaultValue={v("observacoes")}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
            />
          </label>

          <label className="flex items-center gap-2 text-body-sm text-primary sm:col-span-2">
            <input type="checkbox" name="privada" defaultChecked={Boolean(pendenciaInicial?.privada)} />
            Pendência pessoal (visível apenas para mim)
          </label>
        </div>
      </SectionCard>

      <div className="flex gap-3">
        <SubmitButton>{submitLabel}</SubmitButton>
        {pendenciaInicial && (
          <Button type="button" variant="outlined" onClick={() => window.history.back()}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}
