import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, usuarios, orcamentos } from "@/db/schema";
import { NovaOportunidadeForm } from "./form";

import { BackButton } from "@/components/ui";

export default async function NovaOportunidadePage() {
  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  const listaUsuarios = await db
    .select({ id: usuarios.id, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(usuarios.nome);

  const listaOrcamentos = await db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      valor: orcamentos.valor,
      clienteNome: clientes.nome,
    })
    .from(orcamentos)
    .innerJoin(clientes, eq(orcamentos.clienteId, clientes.id))
    .where(eq(orcamentos.status, "pendente"))
    .orderBy(desc(orcamentos.criadoEm))
    .limit(30);

  return (
    <div className="space-y-gutter">
      <BackButton href="/pipeline" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Nova Oportunidade</h1>
      <NovaOportunidadeForm
        listaClientes={listaClientes}
        listaUsuarios={listaUsuarios}
        listaOrcamentos={listaOrcamentos}
      />
    </div>
  );
}
