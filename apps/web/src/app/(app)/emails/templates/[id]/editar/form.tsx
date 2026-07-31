"use client";

import { TemplateForm } from "../../template-form";
import { atualizarTemplate } from "../../../actions";

export function EditarTemplateForm({
  templateId,
  valoresIniciais,
}: {
  templateId: string;
  valoresIniciais: { nome: string; tipo: string; assunto: string; corpo: string };
}) {
  const acao = atualizarTemplate.bind(null, templateId);

  return (
    <TemplateForm
      action={acao}
      valoresIniciais={valoresIniciais}
      titulo="Editar Template"
      textoBotao="Salvar Alterações"
    />
  );
}
