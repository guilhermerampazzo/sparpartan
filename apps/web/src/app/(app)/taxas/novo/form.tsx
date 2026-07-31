"use client";

import { useActionState } from "react";
import { Campo, CampoSelect } from "@/components/ui/form-field";
import { SubmitButton, FormError, CampoMoeda } from "@/components/ui";
import { OcrTaxa } from "@/components/ocr/ocr-taxa";
import { criarTaxa } from "../actions";

export function NovaTaxaForm({
  listaClientes,
  listaProcessos,
}: {
  listaClientes: { id: string; nome: string; cpfCnpj: string | null }[];
  listaProcessos: { id: string; label: string }[];
}) {
  const [estado, formAction] = useActionState(criarTaxa, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  return (
    <form
      action={formAction}
      className="max-w-2xl space-y-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
    >
      <FormError erro={estado?.erro} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Campo label="Descrição da Taxa" name="descricao" required defaultValue={v("descricao")} />
        <CampoMoeda label="Valor" name="valor" required defaultValue={v("valor")} />
        <Campo label="Vencimento / Validade" name="vencimento" type="date" defaultValue={v("vencimento")} />
        <Campo label="Número (guia/DARF/GRU)" name="numero" defaultValue={v("numero")} />
        <CampoSelect
          label="Cliente (opcional)"
          name="clienteId"
          defaultValue={v("clienteId")}
          options={[
            { value: "", label: "—" },
            ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
          ]}
        />
        <CampoSelect
          label="Processo (opcional)"
          name="processoId"
          defaultValue={v("processoId")}
          options={[
            { value: "", label: "—" },
            ...listaProcessos.map((p) => ({ value: p.id, label: p.label })),
          ]}
        />
      </div>

      <label className="flex flex-col gap-1">
        <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
          Boleto/Taxa (PDF)
        </span>
        <input
          name="arquivo"
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
        />
      </label>

      <OcrTaxa listaClientes={listaClientes} />

      <SubmitButton>Registrar Taxa</SubmitButton>
    </form>
  );
}
