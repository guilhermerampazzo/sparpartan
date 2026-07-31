import { db } from "@/db";
import { clientes } from "@/db/schema";
import { NovaOportunidadeForm } from "./form";

export default async function NovaOportunidadePage() {
  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Nova Oportunidade</h1>
      <NovaOportunidadeForm listaClientes={listaClientes} />
    </div>
  );
}
