"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoMoeda, BackButton } from "@/components/ui";
import { criarServico } from "../actions";

export default function NovoServicoPage() {
  const [estado, formAction] = useActionState(criarServico, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  return (
    <div className="space-y-gutter">
      <BackButton href="/servicos" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Serviço</h1>

      <form action={formAction} className="max-w-2xl space-y-6">
        <FormError erro={estado?.erro} />

        <SectionCard title="Dados do Serviço">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Campo label="Nome" name="nome" required defaultValue={v("nome")} />
            <CampoSelect
              label="Categoria"
              name="categoria"
              defaultValue={v("categoria") || "despachante"}
              options={[
                { value: "despachante", label: "Despachante" },
                { value: "escola", label: "Escola Náutica" },
                { value: "engenharia", label: "Engenharia" },
                { value: "ultrassom", label: "Ultrassom" },
              ]}
            />
            <Campo label="Norma" name="norma" defaultValue={v("norma")} />
            <CampoMoeda label="Valor" name="valor" defaultValue={v("valor")} />
            <CampoMoeda label="Custo" name="custo" defaultValue={v("custo")} />
          </div>
          <label className="mt-4 flex flex-col gap-1">
            <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
              Descrição
            </span>
            <textarea
              name="descricao"
              rows={3}
              defaultValue={v("descricao")}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
            />
          </label>
        </SectionCard>

        <SubmitButton>Salvar Serviço</SubmitButton>
      </form>
    </div>
  );
}
