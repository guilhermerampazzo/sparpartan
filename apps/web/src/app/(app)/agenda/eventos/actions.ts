"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { eventos, eventoVinculos, usuarios } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";
import { ENTIDADES_EVENTO, entidadeValida, entidadeExiste } from "@/lib/agenda-eventos";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const DATA_RE = /^\d{4}-\d{2}-\d{2}$/;
const STATUS_EVENTO = ["pendente", "em_andamento", "concluido", "arquivado"] as const;
type StatusEventoInterno = (typeof STATUS_EVENTO)[number];

function uuidOuNull(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  return UUID_RE.test(texto) ? texto : null;
}

type VinculoInput = { entidade: string; entidadeId: string };
type DadosEvento = {
  titulo: string;
  descricao: string | null;
  data: string;
  prazoSolucao: string | null;
  responsavelId: string | null;
  status: StatusEventoInterno;
  observacoes: string | null;
  vinculos: VinculoInput[];
};

async function extrairDadosEvento(formData: FormData): Promise<{ erro?: string; valores?: Record<string, string>; dados?: DadosEvento }> {
  const valores = valoresDoFormData(formData);
  const titulo = String(formData.get("titulo") ?? "").trim();
  const data = String(formData.get("data") ?? "");
  const prazoSolucao = String(formData.get("prazoSolucao") ?? "").trim();
  const status = String(formData.get("status") ?? "pendente");
  const responsavelId = uuidOuNull(formData.get("responsavelId"));

  // Vínculos: até 3 linhas (entidade + item), linha com item mas sem entidade é ignorada.
  const vinculos: VinculoInput[] = [];
  for (let i = 1; i <= 3; i++) {
    const entidade = String(formData.get(`vinculoEntidade${i}`) ?? "").trim();
    const entidadeId = String(formData.get(`vinculoId${i}`) ?? "").trim();
    if (!entidade && !entidadeId) continue;
    if (!entidade || !entidadeId) {
      return { erro: "Cada vínculo precisa de entidade e item selecionados.", valores };
    }
    vinculos.push({ entidade, entidadeId });
  }

  const validador = new Validador()
    .exigir(!!titulo, "Informe o título do evento.")
    .exigir(DATA_RE.test(data), "Informe uma data válida (AAAA-MM-DD).")
    .exigir(!prazoSolucao || DATA_RE.test(prazoSolucao), "Prazo para solução inválido.")
    .exigir(STATUS_EVENTO.includes(status as StatusEventoInterno), "Status inválido.")
    .exigir(vinculos.every((v) => entidadeValida(v.entidade)), "Tipo de vínculo inválido.");

  // Responsável precisa existir (se informado).
  if (responsavelId) {
    const [usuario] = await db.select().from(usuarios).where(eq(usuarios.id, responsavelId)).limit(1);
    validador.exigir(!!usuario, "Responsável não encontrado.");
  }

  // Cada item vinculado precisa existir na entidade.
  for (const v of vinculos) {
    if (entidadeValida(v.entidade)) {
      const existe = await entidadeExiste(v.entidade, v.entidadeId);
      validador.exigir(existe, "Um dos itens vinculados não foi encontrado.");
    }
  }

  const erro = validador.erro;
  if (erro || !titulo || !DATA_RE.test(data)) return { erro: erro ?? "Dados inválidos.", valores };

  const statusTipado = status as StatusEventoInterno;

  return {
    dados: {
      titulo,
      descricao: String(formData.get("descricao") ?? "").trim() || null,
      data,
      prazoSolucao: prazoSolucao || null,
      responsavelId,
      status: statusTipado,
      observacoes: String(formData.get("observacoes") ?? "").trim() || null,
      vinculos,
    },
  };
}

async function gravarVinculos(eventoId: string, vinculos: VinculoInput[]) {
  await db.delete(eventoVinculos).where(eq(eventoVinculos.eventoId, eventoId));
  if (vinculos.length > 0) {
    await db.insert(eventoVinculos).values(
      vinculos.map((v) => ({ eventoId, entidade: v.entidade, entidadeId: v.entidadeId }))
    );
  }
}

/** Entry única do form: decide criar ou atualizar pela presença do campo `id`. */
export async function salvarEvento(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "");
  if (UUID_RE.test(id)) return atualizarEventoInterno(_estadoAnterior, formData);
  return criarEventoInterno(_estadoAnterior, formData);
}

export async function criarEventoInterno(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const { erro, valores, dados } = await extrairDadosEvento(formData);
  if (erro || !dados) return { erro, valores };

  const [evento] = await db
    .insert(eventos)
    .values({
      titulo: dados.titulo,
      descricao: dados.descricao,
      data: dados.data,
      prazoSolucao: dados.prazoSolucao,
      responsavelId: dados.responsavelId,
      status: dados.status,
      observacoes: dados.observacoes,
    })
    .returning({ id: eventos.id });

  await gravarVinculos(evento.id, dados.vinculos);
  await registrarAuditoria("criar", "evento", evento.id, dados.titulo);
  redirect(`/agenda/eventos/${evento.id}`);
}

export async function atualizarEventoInterno(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { erro: "Evento inválido." };

  const { erro, valores, dados } = await extrairDadosEvento(formData);
  if (erro || !dados) return { erro, valores };

  await db
    .update(eventos)
    .set({
      titulo: dados.titulo,
      descricao: dados.descricao,
      data: dados.data,
      prazoSolucao: dados.prazoSolucao,
      responsavelId: dados.responsavelId,
      status: dados.status,
      observacoes: dados.observacoes,
      atualizadoEm: new Date(),
    })
    .where(eq(eventos.id, id));

  await gravarVinculos(id, dados.vinculos);
  await registrarAuditoria("atualizar", "evento", id, dados.titulo);
  redirect(`/agenda/eventos/${id}`);
}

export async function concluirEventoInterno(eventoId: string) {
  await db
    .update(eventos)
    .set({ status: "concluido", concluidoEm: new Date(), atualizadoEm: new Date() })
    .where(eq(eventos.id, eventoId));
  await registrarAuditoria("alterar_status", "evento", eventoId, "concluído");
  redirect(`/agenda/eventos/${eventoId}`);
}

export async function arquivarEventoInterno(eventoId: string) {
  await db
    .update(eventos)
    .set({ status: "arquivado", arquivadoEm: new Date(), atualizadoEm: new Date() })
    .where(eq(eventos.id, eventoId));
  await registrarAuditoria("arquivar", "evento", eventoId, "arquivado");
  redirect(`/agenda/eventos/${eventoId}`);
}

export async function reabrirEventoInterno(eventoId: string) {
  await db
    .update(eventos)
    .set({ status: "pendente", concluidoEm: null, arquivadoEm: null, atualizadoEm: new Date() })
    .where(eq(eventos.id, eventoId));
  await registrarAuditoria("alterar_status", "evento", eventoId, "reaberto");
  redirect(`/agenda/eventos/${eventoId}`);
}
