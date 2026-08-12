"use client";

import { BackButton } from "@/components/ui";

import { TemplateForm } from "../template-form";
import { criarTemplate } from "../../actions";

export default function NovoTemplatePage() {
  return (
    <>
      <BackButton href="/emails" />
      <TemplateForm action={criarTemplate} titulo="Novo Template" textoBotao="Salvar Template" />
    </>
  );
}
