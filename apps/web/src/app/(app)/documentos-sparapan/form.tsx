"use client";

import { useActionState } from "react";
import { Campo, CampoSelect, SectionCard } from "@/components/ui/form-field";
import { SubmitButton, FormError } from "@/components/ui";
import { criarArquivoEmpresa } from "./actions";
import { ARQUIVOS_EMPRESA_CATEGORIAS } from "@/lib/arquivos-empresa";

export function NovoArquivoEmpresaForm() {
  const [estado, formAction] = useActionState(criarArquivoEmpresa, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  return (
    <SectionCard title="Adicionar Documento">
      <form action={formAction} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <FormError erro={estado?.erro} />
        <Campo label="Título" name="titulo" required defaultValue={v("titulo")} />
        <CampoSelect
          label="Categoria"
          name="categoria"
          required
          defaultValue={v("categoria")}
          options={[
            { value: "", label: "Selecione..." },
            ...ARQUIVOS_EMPRESA_CATEGORIAS.map((c) => ({ value: c.value, label: c.label })),
          ]}
        />
        <label className="flex flex-col gap-1 sm:col-span-2">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Arquivo (PDF, JPG ou PNG)
          </span>
          <input
            name="arquivo"
            type="file"
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            required
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>
        <label className="flex flex-col gap-1 sm:col-span-4">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">
            Descrição (opcional)
          </span>
          <textarea
            name="descricao"
            rows={2}
            defaultValue={v("descricao")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>
        <div className="sm:col-span-4">
          <SubmitButton>Salvar Documento</SubmitButton>
        </div>
      </form>
    </SectionCard>
  );
}
