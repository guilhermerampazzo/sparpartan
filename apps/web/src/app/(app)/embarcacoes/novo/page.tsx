import { db } from "@/db";
import { clientes } from "@/db/schema";
import { NovaEmbarcacaoForm } from "./form";

import { BackButton } from "@/components/ui";

export default async function NovaEmbarcacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ classe?: string }>;
}) {
  const { classe } = await searchParams;
  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  return (
    <div className="space-y-gutter">
      <BackButton href="/embarcacoes" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Nova Embarcação</h1>
      <NovaEmbarcacaoForm listaClientes={listaClientes} classeInicial={classe} />
    </div>
  );
}
