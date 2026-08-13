import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, processos, servicos } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { NovaTaxaForm } from "./form";

export default async function NovaTaxaPage() {
  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome, cpfCnpj: clientes.cpfCnpj })
    .from(clientes)
    .orderBy(clientes.nome);

  const processosRaw = await db
    .select({
      id: processos.id,
      clienteId: processos.clienteId,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
    })
    .from(processos)
    .innerJoin(clientes, eq(processos.clienteId, clientes.id))
    .innerJoin(servicos, eq(processos.servicoId, servicos.id))
    .orderBy(processos.criadoEm);

  const listaProcessos = processosRaw.map((p) => ({
    id: p.id,
    clienteId: p.clienteId,
    label: `${p.clienteNome} — ${p.servicoNome}`,
  }));

  return (
    <div className="space-y-gutter">
      <BackButton href="/taxas" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Nova Taxa a Pagar</h1>
      <p className="max-w-2xl text-body-sm text-outline">
        Registre a taxa/boleto de órgãos (Marinha, GRU etc.) assim que o colaborador receber, mesmo
        antes de a empresa efetuar o pagamento. O PDF do boleto fica anexado para consulta.
      </p>
      <NovaTaxaForm listaClientes={listaClientes} listaProcessos={listaProcessos} />
    </div>
  );
}
