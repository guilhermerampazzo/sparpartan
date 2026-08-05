import { db } from "@/db";
import { clientes } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { NovaPendenciaForm } from "../form";

export default async function NovaPendenciaPage() {
  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  return (
    <div className="space-y-gutter">
      <BackButton href="/pendencias" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Nova Pendência</h1>
      <NovaPendenciaForm listaClientes={listaClientes} listaResponsaveis={[]} />
    </div>
  );
}
