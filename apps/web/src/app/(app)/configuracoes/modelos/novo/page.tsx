import { db } from "@/db";
import { servicos } from "@/db/schema";
import { ImportarModeloForm } from "./form";

import { BackButton } from "@/components/ui";

export default async function ImportarModeloPage() {
  const listaServicos = await db
    .select({ id: servicos.id, nome: servicos.nome })
    .from(servicos)
    .orderBy(servicos.nome);

  return (
    <div className="space-y-gutter">
      <BackButton href="/configuracoes/modelos" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Importar Modelo</h1>
      <p className="max-w-2xl text-sm text-outline">
        Suba o arquivo .docx do formulário da Marinha. O sistema lê os campos de mesclagem
        (MERGEFIELD) automaticamente — não é necessário digitar os nomes dos campos.
      </p>
      <ImportarModeloForm listaServicos={listaServicos} />
    </div>
  );
}
