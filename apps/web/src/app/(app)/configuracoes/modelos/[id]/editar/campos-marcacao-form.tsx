"use client";

import { useState } from "react";
import { SectionCard } from "@/components/ui/form-field";
import { Button, SubmitButton } from "@/components/ui";
import { atualizarCamposMarcacao } from "../../actions";

type Marcacao = { campo: string; valorMarcado: string; servicoIds: string[] };

export function CamposMarcacaoForm({
  modeloId,
  campos,
  camposMarcacao,
  servicos,
}: {
  modeloId: string;
  campos: string[];
  camposMarcacao: Marcacao[];
  servicos: { id: string; nome: string }[];
}) {
  const [linhas, setLinhas] = useState<Marcacao[]>(
    camposMarcacao.length > 0 ? camposMarcacao : [{ campo: "", valorMarcado: "X", servicoIds: [] }]
  );
  const acaoComId = atualizarCamposMarcacao.bind(null, modeloId);

  return (
    <SectionCard title="Marcação automática de campos por serviço">
      <p className="mb-4 text-body-sm text-outline">
        Para formulários com várias opções (ex: finalidade do requerimento), escolha qual campo de
        mesclagem deve ser marcado automaticamente quando o documento for gerado para cada serviço.
      </p>
      <form action={acaoComId} className="space-y-4">
        <input type="hidden" name="linhas" value={linhas.length} />
        {linhas.map((linha, i) => (
          <div key={i} className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant p-3 sm:grid-cols-3">
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                Campo do modelo
              </span>
              <select
                name={`campo_${i}`}
                defaultValue={linha.campo}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              >
                <option value="">Selecione...</option>
                {campos.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                Valor quando marcado
              </span>
              <input
                name={`valor_${i}`}
                defaultValue={linha.valorMarcado || "X"}
                className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              />
            </label>
            <div className="flex flex-col gap-1">
              <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
                Serviços que acionam
              </span>
              <div className="flex max-h-28 flex-col gap-1 overflow-y-auto rounded-lg border border-outline-variant p-2">
                {servicos.map((s) => (
                  <label key={s.id} className="flex items-center gap-2 text-body-sm text-primary">
                    <input
                      type="checkbox"
                      name={`servicos_${i}`}
                      value={s.id}
                      defaultChecked={linha.servicoIds.includes(s.id)}
                    />
                    {s.nome}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ))}

        <div className="flex gap-3">
          <Button
            type="button"
            variant="outlined"
            onClick={() =>
              setLinhas((atual) => [...atual, { campo: "", valorMarcado: "X", servicoIds: [] }])
            }
          >
            + Adicionar campo
          </Button>
          <SubmitButton>Salvar Marcações</SubmitButton>
        </div>
      </form>
    </SectionCard>
  );
}
