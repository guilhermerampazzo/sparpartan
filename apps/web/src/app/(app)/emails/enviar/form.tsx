"use client";

import { useActionState, useState } from "react";
import { CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { enviarEmailCliente } from "../actions";

export function EnviarEmailForm({
  listaClientes,
  listaTemplates,
}: {
  listaClientes: { id: string; nome: string; email: string | null }[];
  listaTemplates: { id: string; nome: string }[];
}) {
  const [estado, formAction] = useActionState(enviarEmailCliente, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";
  const [clienteId, setClienteId] = useState(v("clienteId"));

  const clienteSelecionado = listaClientes.find((c) => c.id === clienteId);

  return (
    <form action={formAction} className="max-w-xl space-y-6">
      <FormError erro={estado?.erro} />

      <SectionCard title="Destinatário e Template">
        <div className="grid grid-cols-1 gap-4">
          <CampoSelect
            label="Cliente"
            name="clienteId"
            required
            defaultValue={v("clienteId")}
            onChange={(e) => setClienteId(e.target.value)}
            options={[
              { value: "", label: "Selecione..." },
              ...listaClientes.map((c) => ({
                value: c.id,
                label: c.email ? c.nome : `${c.nome} (sem e-mail)`,
              })),
            ]}
          />
          {clienteSelecionado && (
            <div className="rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-body-sm text-outline">
              Destinatário: {clienteSelecionado.nome}{" "}
              {clienteSelecionado.email ? (
                <span className="font-medium text-primary">&lt;{clienteSelecionado.email}&gt;</span>
              ) : (
                <span className="text-error">— sem e-mail cadastrado</span>
              )}
            </div>
          )}
          <CampoSelect
            label="Template"
            name="templateId"
            required
            defaultValue={v("templateId")}
            options={[
              { value: "", label: "Selecione..." },
              ...listaTemplates.map((t) => ({ value: t.id, label: t.nome })),
            ]}
          />
        </div>
      </SectionCard>

      <SubmitButton>Enviar</SubmitButton>
    </form>
  );
}
