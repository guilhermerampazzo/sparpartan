"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoMoeda } from "@/components/ui";
import { criarOportunidade } from "../actions";
import type { EstadoForm } from "@/lib/validacao";

export function NovaOportunidadeForm({
  listaClientes,
  oportunidadeInicial,
  action = criarOportunidade,
  submitLabel = "Criar Oportunidade",
}: {
  listaClientes: { id: string; nome: string }[];
  oportunidadeInicial?: Record<string, unknown>;
  action?: (estado: EstadoForm, formData: FormData) => Promise<EstadoForm>;
  submitLabel?: string;
}) {
  const [estado, formAction] = useActionState(action, null);
  const v = (nome: string): string => {
    if (estado?.valores?.[nome] !== undefined) return estado.valores[nome] as string;
    const inicial = oportunidadeInicial?.[nome];
    return inicial === null || inicial === undefined ? "" : String(inicial);
  };

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Dados da Oportunidade">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Campo label="Título" name="titulo" required defaultValue={v("titulo")} />
          <CampoSelect
            label="Cliente já cadastrado (opcional)"
            name="clienteId"
            defaultValue={v("clienteId")}
            options={[
              { value: "", label: "— Lead ainda não cadastrado —" },
              ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />
          <Campo
            label="Telefone de contato"
            name="telefoneContato"
            defaultValue={v("telefoneContato")}
          />
          <Campo label="Origem do lead" name="origem" defaultValue={v("origem")} />
          <CampoMoeda label="Valor estimado" name="valorEstimado" defaultValue={v("valorEstimado")} />
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

      <SubmitButton>{submitLabel}</SubmitButton>
    </form>
  );
}

