"use client";

import { TemplateForm } from "../template-form";
import { criarTemplate } from "../../actions";

export default function NovoTemplatePage() {
  return <TemplateForm action={criarTemplate} titulo="Novo Template" textoBotao="Salvar Template" />;
}
