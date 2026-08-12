import { db } from "@/db";
import { clientes, engenheiros } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NovaObraForm } from "./form";

import { BackButton } from "@/components/ui";

export default async function NovaObraPage() {
  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  const listaEngenheiros = await db
    .select()
    .from(engenheiros)
    .where(eq(engenheiros.ativo, true))
    .orderBy(engenheiros.nomeCompleto);

  return (
    <div className="space-y-gutter">
      <BackButton href="/obras" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Nova Obra</h1>
      <p className="max-w-2xl text-sm text-outline">
        Preenche o Memorial Descritivo e o Requerimento 2-B-1 (NORMAM-303) automaticamente
        quando você gerar o documento em Documentos → Gerar.
      </p>
      <NovaObraForm listaClientes={listaClientes} listaEngenheiros={listaEngenheiros} />
    </div>
  );
}
