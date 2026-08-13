import { and, asc, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import { clientes, processos, servicos } from "@/db/schema";

export type ResumoCliente = {
  id: string;
  nome: string;
  cpfCnpj: string;
  telefone: string | null;
  celular: string | null;
  email: string | null;
  cidade: string | null;
  uf: string | null;
  classificacao: string;
  // Processo mais recente (para mostrar serviço + status no card).
  servicoProcesso: string | null;
  statusProcesso: string | null;
  criadoEmProcesso: Date | null;
};

/**
 * Lista todos os clientes ativos com o processo mais recente de cada um
 * (nome do serviço + status) — usado pela grade de cartões com busca fluida.
 */
export async function listarClientesResumo(): Promise<ResumoCliente[]> {
  const clientesAtivos = await db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      cpfCnpj: clientes.cpfCnpj,
      telefone: clientes.telefone,
      celular: clientes.celular,
      email: clientes.email,
      cidade: clientes.cidade,
      uf: clientes.uf,
      classificacao: clientes.classificacao,
    })
    .from(clientes)
    .where(and(isNull(clientes.excluidoEm), eq(clientes.ativo, true)))
    .orderBy(asc(clientes.nome));

  const processosAtivos = await db
    .select({
      clienteId: processos.clienteId,
      status: processos.status,
      servicoNome: servicos.nome,
      criadoEm: processos.criadoEm,
    })
    .from(processos)
    .innerJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(isNull(processos.excluidoEm))
    .orderBy(asc(processos.criadoEm));

  // Último processo de cada cliente (criadoEm asc → o último vence).
  const ultimoPorCliente = new Map<string, { servicoNome: string; status: string; criadoEm: Date }>();
  for (const p of processosAtivos) {
    ultimoPorCliente.set(p.clienteId, { servicoNome: p.servicoNome, status: p.status, criadoEm: p.criadoEm });
  }

  return clientesAtivos.map((c) => {
    const ultimo = ultimoPorCliente.get(c.id);
    return {
      ...c,
      servicoProcesso: ultimo?.servicoNome ?? null,
      statusProcesso: ultimo?.status ?? null,
      criadoEmProcesso: ultimo?.criadoEm ?? null,
    };
  });
}
