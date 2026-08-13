import { and, eq, isNull } from "drizzle-orm";
import { db } from "@/db";
import {
  alunos,
  clientes,
  documentosGerados,
  embarcacoes,
  modelosDocumento,
  obras,
  orcamentos,
  processos,
  servicos,
  taxasPagar,
  usuarios,
  eventos,
  eventoVinculos,
} from "@/db/schema";
import { entidadeValida, type EntidadeEvento } from "./agenda-entidades";

/** Entidades que um Evento interno pode vincular. */
export { ENTIDADES_EVENTO, entidadeValida, type EntidadeEvento } from "./agenda-entidades";

/** Lista de itens de uma entidade para o select de vínculo — { id, rotulo }. */
export async function buscarItensEntidade(entidade: EntidadeEvento): Promise<{ id: string; rotulo: string }[]> {
  switch (entidade) {
    case "cliente":
      return db
        .select({ id: clientes.id, rotulo: clientes.nome })
        .from(clientes)
        .where(isNull(clientes.excluidoEm))
        .orderBy(clientes.nome);
    case "processo": {
      const linhas = await db
        .select({ id: processos.id, servicoNome: servicos.nome, protocolo: processos.numeroProtocolo, clienteNome: clientes.nome })
        .from(processos)
        .innerJoin(servicos, eq(processos.servicoId, servicos.id))
        .leftJoin(clientes, eq(processos.clienteId, clientes.id))
        .where(isNull(processos.excluidoEm))
        .orderBy(processos.criadoEm);
      return linhas.map((l) => ({
        id: l.id,
        rotulo: `${l.servicoNome} — ${l.clienteNome ?? "sem cliente"}${l.protocolo ? ` (${l.protocolo})` : ""}`,
      }));
    }
    case "embarcacao":
      return db
        .select({ id: embarcacoes.id, rotulo: embarcacoes.nome })
        .from(embarcacoes)
        .orderBy(embarcacoes.nome);
    case "orcamento":
      return db
        .select({ id: orcamentos.id, rotulo: orcamentos.numero })
        .from(orcamentos)
        .where(isNull(orcamentos.excluidoEm))
        .orderBy(orcamentos.criadoEm);
    case "documento": {
      const linhas = await db
        .select({ id: documentosGerados.id, modeloNome: modelosDocumento.nome })
        .from(documentosGerados)
        .innerJoin(modelosDocumento, eq(documentosGerados.modeloId, modelosDocumento.id))
        .orderBy(documentosGerados.criadoEm);
      return linhas.map((l) => ({ id: l.id, rotulo: l.modeloNome }));
    }
    case "servico":
      return db
        .select({ id: servicos.id, rotulo: servicos.nome })
        .from(servicos)
        .where(eq(servicos.ativo, true))
        .orderBy(servicos.nome);
    case "obra": {
      const linhas = await db
        .select({ id: obras.id, rotulo: obras.titulo })
        .from(obras)
        .orderBy(obras.criadoEm);
      return linhas.map((l) => ({ id: l.id, rotulo: l.rotulo ?? "Obra sem título" }));
    }
    case "taxa": {
      const linhas = await db
        .select({ id: taxasPagar.id, descricao: taxasPagar.descricao, numero: taxasPagar.numero })
        .from(taxasPagar)
        .orderBy(taxasPagar.criadoEm);
      return linhas.map((l) => ({ id: l.id, rotulo: `${l.descricao ?? "Taxa"}${l.numero ? ` (${l.numero})` : ""}` }));
    }
    case "aluno":
      return db
        .select({ id: alunos.id, rotulo: alunos.nome })
        .from(alunos)
        .orderBy(alunos.nome);
    default:
      return [];
  }
}

/** Confere se o id existe na tabela da entidade (validação server-side do vínculo). */
export async function entidadeExiste(entidade: EntidadeEvento, id: string): Promise<boolean> {
  const itens = await buscarItensEntidade(entidade);
  return itens.some((i) => i.id === id);
}

export type EventoCompleto = {
  id: string;
  titulo: string;
  descricao: string | null;
  data: string;
  prazoSolucao: string | null;
  responsavelId: string | null;
  responsavelNome: string | null;
  status: string;
  observacoes: string | null;
  criadoEm: Date;
  concluidoEm: Date | null;
  arquivadoEm: Date | null;
  vinculos: { id: string; entidade: string; entidadeId: string; rotulo: string }[];
};

export async function buscarEventoCompleto(id: string): Promise<EventoCompleto | null> {
  const [evento] = await db
    .select({
      id: eventos.id,
      titulo: eventos.titulo,
      descricao: eventos.descricao,
      data: eventos.data,
      prazoSolucao: eventos.prazoSolucao,
      responsavelId: eventos.responsavelId,
      responsavelNome: usuarios.nome,
      status: eventos.status,
      observacoes: eventos.observacoes,
      criadoEm: eventos.criadoEm,
      concluidoEm: eventos.concluidoEm,
      arquivadoEm: eventos.arquivadoEm,
    })
    .from(eventos)
    .leftJoin(usuarios, eq(eventos.responsavelId, usuarios.id))
    .where(eq(eventos.id, id))
    .limit(1);

  if (!evento) return null;

  const vinculos = await db
    .select({ id: eventoVinculos.id, entidade: eventoVinculos.entidade, entidadeId: eventoVinculos.entidadeId })
    .from(eventoVinculos)
    .where(eq(eventoVinculos.eventoId, id));

  const vinculosComRotulo = await Promise.all(
    vinculos.map(async (v) => {
      const rotulo = entidadeValida(v.entidade)
        ? (await buscarItensEntidade(v.entidade)).find((i) => i.id === v.entidadeId)?.rotulo ?? "Item removido"
        : v.entidade;
      return { ...v, rotulo };
    })
  );

  return { ...evento, vinculos: vinculosComRotulo };
}
