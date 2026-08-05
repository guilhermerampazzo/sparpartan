import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, servicos, usuarios } from "@/db/schema";
import { NovoProcessoForm } from "./form";

export default async function NovoProcessoPage({
  searchParams,
}: {
  searchParams: Promise<{ clienteId?: string; servicoId?: string }>;
}) {
  const { clienteId, servicoId } = await searchParams;

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  const listaServicos = await db
    .select({ id: servicos.id, nome: servicos.nome })
    .from(servicos)
    .orderBy(servicos.nome);

  const listaUsuarios = await db
    .select({ id: usuarios.id, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(usuarios.nome);

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Novo Atendimento</h1>
      <NovoProcessoForm
        listaClientes={listaClientes}
        listaServicos={listaServicos}
        listaUsuarios={listaUsuarios}
        clienteInicial={clienteId}
        servicoInicial={servicoId}
      />
    </div>
  );
}
