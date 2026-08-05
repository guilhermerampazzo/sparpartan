import { and, asc, eq, gte, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import { agendaEventos, agendaInteressados, clientes, processos, servicos } from "@/db/schema";

export type ProcessoAgendadoLinha = {
  id: string;
  titulo: string;
  dataHora: Date;
  tipo: string;
  status: string;
  local: string | null;
  representanteLegal: string | null;
  clienteNome: string | null;
  servicoNome: string | null;
  processoId: string | null;
  interessados: { nomeInteressado: string; servicoSolicitado: string | null }[];
};

/** Eventos agendados (de hoje em diante, não cancelados) com cliente/serviço e interessados. */
export async function buscarProcessosAgendados(): Promise<ProcessoAgendadoLinha[]> {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const eventos = await db
    .select({
      id: agendaEventos.id,
      titulo: agendaEventos.titulo,
      dataHora: agendaEventos.dataHora,
      tipo: agendaEventos.tipo,
      status: agendaEventos.status,
      local: agendaEventos.local,
      representanteLegal: agendaEventos.representanteLegal,
      processoId: agendaEventos.processoId,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
    })
    .from(agendaEventos)
    .leftJoin(clientes, eq(agendaEventos.clienteId, clientes.id))
    .leftJoin(processos, eq(agendaEventos.processoId, processos.id))
    .leftJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(and(gte(agendaEventos.dataHora, hoje), ne(agendaEventos.status, "cancelado")))
    .orderBy(asc(agendaEventos.dataHora));

  const interessadosPorEvento = new Map<string, ProcessoAgendadoLinha["interessados"]>();
  if (eventos.length > 0) {
    const todosInteressados = await db
      .select()
      .from(agendaInteressados)
      .where(inArray(agendaInteressados.eventoId, eventos.map((ev) => ev.id)));
    for (const it of todosInteressados) {
      const lista = interessadosPorEvento.get(it.eventoId) ?? [];
      lista.push({ nomeInteressado: it.nomeInteressado, servicoSolicitado: it.servicoSolicitado });
      interessadosPorEvento.set(it.eventoId, lista);
    }
  }

  return eventos.map((ev) => ({
    ...ev,
    interessados: interessadosPorEvento.get(ev.id) ?? [],
  }));
}
