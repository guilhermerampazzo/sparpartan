"use client";

import { useActionState } from "react";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { gerarDocumento } from "../actions";

export function GerarDocumentoForm({
  modeloId,
  modeloNome,
  clienteId,
  embarcacaoId,
  obraId,
  processoId,
  campos,
  camposResolvidos,
}: {
  modeloId: string;
  modeloNome: string;
  clienteId: string;
  embarcacaoId: string;
  obraId?: string;
  processoId?: string;
  campos: string[];
  camposResolvidos: Record<string, string>;
}) {
  const [estado, formAction] = useActionState(gerarDocumento, null);
  const v = (campo: string) => estado?.valores?.[`campo_${campo}`] ?? camposResolvidos[campo] ?? "";

  return (
    <SectionCard title={`2. Campos de "${modeloNome}"`}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="modeloId" value={modeloId} />
        <input type="hidden" name="clienteId" value={clienteId} />
        <input type="hidden" name="embarcacaoId" value={embarcacaoId} />
        {obraId && <input type="hidden" name="obraId" value={obraId} />}
        {processoId && <input type="hidden" name="processoId" value={processoId} />}

        <FormError erro={estado?.erro} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {campos.map((campo) => (
            <Campo key={campo} label={campo} name={`campo_${campo}`} defaultValue={v(campo)} />
          ))}
        </div>

        <SubmitButton>Gerar DOCX + PDF</SubmitButton>
      </form>
    </SectionCard>
  );
}
