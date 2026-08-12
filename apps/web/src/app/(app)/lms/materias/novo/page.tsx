"use client";

import { useActionState } from "react";
import { Campo, SubmitButton, FormError, SeletorIconeLms, CampoMoeda, BackButton } from "@/components/ui";
import { criarMateria } from "../actions";

export default function NovaMateriaPage() {
  const [estado, formAction] = useActionState(criarMateria, null);
  const v = (nome: string) => estado?.valores?.[nome] ?? "";

  return (
    <div className="space-y-gutter">
      <BackButton href="/lms/materias" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Nova Matéria</h1>

      <form
        action={formAction}
        className="max-w-3xl space-y-6 rounded-xl border border-outline-variant bg-surface-container-lowest p-6"
      >
        <FormError erro={estado?.erro} />

        <Campo label="Título" name="titulo" required defaultValue={v("titulo")} />

        <label className="flex flex-col gap-1">
          <span className="font-mono-caps text-[11px] uppercase tracking-wide text-outline">Descrição</span>
          <textarea
            name="descricao"
            rows={3}
            defaultValue={v("descricao")}
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
          />
        </label>

        <SeletorIconeLms name="icone" defaultValue={v("icone")} />

        <CampoMoeda label="Preço (deixe em branco para liberar acesso só manualmente)" name="preco" defaultValue={v("preco")} />

        <SubmitButton>Salvar Matéria</SubmitButton>
      </form>
    </div>
  );
}
