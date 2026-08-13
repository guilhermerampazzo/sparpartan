import { and, asc, eq, gte, inArray, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  agendaEventos,
  agendaInteressados,
  agendamentoProcessos,
  clientes,
  processos,
  representantesLegais,
  servicos,
} from "@/db/schema";

export type AgendamentoCompleto = {
  id: string;
  titulo: string;
  dataHora: Date;
  tipo: string;
  status: string;
  local: string | null;
  observacoes: string | null;
  cliente: { id: string; nome: string } | null;
  servico: { id: string; nome: string } | null;
  representanteLegal: { id: string; nome: string; cpf: string | null } | null;
  interessados: {
    id: string;
    nome: string;
    cpf: string | null;
    servicoSolicitado: string | null;
    observacao: string | null;
  }[];
  processos: {
    id: string;
    numeroProtocolo: string | null;
    servicoNome: string | null;
  }[];
};

/** Carrega um agendamento com cliente, serviço, representante legal, interessados e processos. */
export async function buscarAgendamentoCompleto(
  id: string
): Promise<AgendamentoCompleto | null> {
  const [evento] = await db
    .select({
      id: agendaEventos.id,
      titulo: agendaEventos.titulo,
      dataHora: agendaEventos.dataHora,
      tipo: agendaEventos.tipo,
      status: agendaEventos.status,
      local: agendaEventos.local,
      observacoes: agendaEventos.observacoes,
      clienteId: agendaEventos.clienteId,
      clienteNome: clientes.nome,
      servicoId: agendaEventos.servicoId,
      servicoNome: servicos.nome,
      representanteId: agendaEventos.representanteLegalId,
      representanteNome: representantesLegais.nome,
      representanteCpf: representantesLegais.cpf,
    })
    .from(agendaEventos)
    .leftJoin(clientes, eq(agendaEventos.clienteId, clientes.id))
    .leftJoin(servicos, eq(agendaEventos.servicoId, servicos.id))
    .leftJoin(representantesLegais, eq(agendaEventos.representanteLegalId, representantesLegais.id))
    .where(eq(agendaEventos.id, id))
    .limit(1);

  if (!evento) return null;

  const [interessados, processosLinhas] = await Promise.all([
    db
      .select({
        id: agendaInteressados.id,
        nome: agendaInteressados.nomeInteressado,
        cpf: agendaInteressados.cpfInteressado,
        servicoSolicitado: agendaInteressados.servicoSolicitado,
        observacao: agendaInteressados.observacao,
      })
      .from(agendaInteressados)
      .where(eq(agendaInteressados.eventoId, id))
      .orderBy(asc(agendaInteressados.criadoEm)),
    db
      .select({
        id: processos.id,
        numeroProtocolo: processos.numeroProtocolo,
        servicoNome: servicos.nome,
      })
      .from(agendamentoProcessos)
      .innerJoin(processos, eq(agendamentoProcessos.processoId, processos.id))
      .leftJoin(servicos, eq(processos.servicoId, servicos.id))
      .where(eq(agendamentoProcessos.agendamentoId, id))
      .orderBy(asc(agendamentoProcessos.ordem)),
  ]);

  return {
    id: evento.id,
    titulo: evento.titulo,
    dataHora: evento.dataHora,
    tipo: evento.tipo,
    status: evento.status,
    local: evento.local,
    observacoes: evento.observacoes,
    cliente: evento.clienteId ? { id: evento.clienteId, nome: evento.clienteNome ?? "Cliente removido" } : null,
    servico: evento.servicoId ? { id: evento.servicoId, nome: evento.servicoNome ?? "Serviço removido" } : null,
    representanteLegal: evento.representanteId
      ? { id: evento.representanteId, nome: evento.representanteNome ?? "—", cpf: evento.representanteCpf }
      : null,
    interessados,
    processos: processosLinhas,
  };
}

/** Agendamentos futuros (não cancelados) com cliente ativo — lista cronológica. */
export async function listarAgendamentos(hoje = new Date()) {
  const inicio = new Date(hoje);
  inicio.setHours(0, 0, 0, 0);

  const linhas = await db
    .select({
      id: agendaEventos.id,
      titulo: agendaEventos.titulo,
      dataHora: agendaEventos.dataHora,
      tipo: agendaEventos.tipo,
      status: agendaEventos.status,
      local: agendaEventos.local,
      clienteId: agendaEventos.clienteId,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
      representanteNome: representantesLegais.nome,
    })
    .from(agendaEventos)
    .leftJoin(clientes, eq(agendaEventos.clienteId, clientes.id))
    .leftJoin(servicos, eq(agendaEventos.servicoId, servicos.id))
    .leftJoin(representantesLegais, eq(agendaEventos.representanteLegalId, representantesLegais.id))
    .where(and(gte(agendaEventos.dataHora, inicio), isNull(clientes.excluidoEm)))
    .orderBy(asc(agendaEventos.dataHora));

  if (linhas.length === 0) return [];

  const [interessados, processosAgendados] = await Promise.all([
    db
      .select({
        eventoId: agendaInteressados.eventoId,
        nome: agendaInteressados.nomeInteressado,
        servico: agendaInteressados.servicoSolicitado,
      })
      .from(agendaInteressados)
      .where(inArray(agendaInteressados.eventoId, linhas.map((l) => l.id)))
      .orderBy(asc(agendaInteressados.criadoEm)),
    db
      .select({
        agendamentoId: agendamentoProcessos.agendamentoId,
        processoId: agendamentoProcessos.processoId,
        servicoNome: servicos.nome,
      })
      .from(agendamentoProcessos)
      .innerJoin(processos, eq(agendamentoProcessos.processoId, processos.id))
      .leftJoin(servicos, eq(processos.servicoId, servicos.id))
      .where(inArray(agendamentoProcessos.agendamentoId, linhas.map((l) => l.id)))
      .orderBy(asc(agendamentoProcessos.ordem)),
  ]);

  const interessadosPorEvento = new Map<string, { nome: string; servico: string | null }[]>();
  for (const it of interessados) {
    const lista = interessadosPorEvento.get(it.eventoId) ?? [];
    lista.push({ nome: it.nome, servico: it.servico });
    interessadosPorEvento.set(it.eventoId, lista);
  }
  const processosPorAgendamento = new Map<string, { processoId: string; servicoNome: string | null }[]>();
  for (const p of processosAgendados) {
    const lista = processosPorAgendamento.get(p.agendamentoId) ?? [];
    lista.push({ processoId: p.processoId, servicoNome: p.servicoNome });
    processosPorAgendamento.set(p.agendamentoId, lista);
  }

  return linhas.map((l) => ({
    ...l,
    interessados: interessadosPorEvento.get(l.id) ?? [],
    processos: processosPorAgendamento.get(l.id) ?? [],
  }));
}
