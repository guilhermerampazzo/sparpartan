"use server";

import { redirect } from "next/navigation";
import { and, eq, inArray } from "drizzle-orm";
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
import { enviarEmail } from "@/lib/mail/adapter";
import { registrarAuditoria } from "@/lib/audit";
import { Validador, valoresDoFormData, cpfValido, type EstadoForm } from "@/lib/validacao";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const TIPOS = ["compromisso", "prova", "vistoria", "vencimento"] as const;
type TipoAgendamento = (typeof TIPOS)[number];

function uuidOuNull(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "").trim();
  return UUID_RE.test(texto) ? texto : null;
}

function dataHoraValida(valor: string): Date | null {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

type DadosAgendamento = {
  titulo: string;
  dataHora: Date;
  tipo: TipoAgendamento;
  clienteId: string;
  servicoId: string;
  representanteLegalId: string;
  local: string | null;
  observacoes: string | null;
  processoIds: string[];
  interessados: {
    nome: string;
    cpf: string | null;
    servicoSolicitado: string | null;
    observacao: string | null;
  }[];
};

/** Valida e extrai tudo que o form de agendamento envia. Retorna erro ou os dados. */
async function extrairDadosAgendamento(
  formData: FormData
): Promise<{ erro?: string; valores?: Record<string, string>; dados?: DadosAgendamento }> {
  const valores = valoresDoFormData(formData);

  const dataHora = dataHoraValida(String(formData.get("dataHora") ?? ""));
  const clienteId = uuidOuNull(formData.get("clienteId"));
  const servicoId = uuidOuNull(formData.get("servicoId"));
  const representanteLegalId = uuidOuNull(formData.get("representanteLegalId"));
  const tipo = String(formData.get("tipo") ?? "compromisso") as TipoAgendamento;

  // Representante legal novo (inline) — cria o registro e usa o id dele.
  let repId = representanteLegalId;
  const repNovoNome = String(formData.get("repNovoNome") ?? "").trim();
  if (!repId && repNovoNome) {
    const [rep] = await db
      .insert(representantesLegais)
      .values({
        nome: repNovoNome,
        cpf: String(formData.get("repNovoCpf") ?? "") || null,
        observacoes: String(formData.get("repNovoObservacoes") ?? "") || null,
      })
      .returning({ id: representantesLegais.id });
    repId = rep.id;
  }

  const processoIdsRaw = formData
    .getAll("processoId")
    .map((v) => String(v).trim())
    .filter(Boolean);

  const processoIds = Array.from(new Set(processoIdsRaw));

  const interessados: DadosAgendamento["interessados"] = [];
  for (let i = 1; i <= 5; i++) {
    const nome = String(formData.get(`interessado${i}Nome`) ?? "").trim();
    const cpf = String(formData.get(`interessado${i}Cpf`) ?? "").trim();
    const servicoSolicitado = String(formData.get(`interessado${i}Servico`) ?? "").trim();
    const observacao = String(formData.get(`interessado${i}Observacao`) ?? "").trim();
    // Linha vazia por completo = ignorada; nome preenchido = linha válida.
    if (!nome && !cpf && !servicoSolicitado && !observacao) continue;
    interessados.push({ nome, cpf: cpf || null, servicoSolicitado: servicoSolicitado || null, observacao: observacao || null });
  }

  const validador = new Validador()
    .exigir(!!dataHora, "Informe a data e hora do agendamento.")
    .exigir(!!clienteId, "Selecione o cliente.")
    .exigir(!!servicoId, "Selecione o serviço.")
    .exigir(!!repId, "Informe o representante legal (selecione ou cadastre um novo).")
    .exigir(TIPOS.includes(tipo), "Tipo de agendamento inválido.")
    .exigir(processoIds.length <= 5, "Um agendamento pode ter no máximo 5 processos.")
    .exigir(
      interessados.every((it) => it.nome),
      "Todo interessado preenchido precisa ter nome."
    )
    .exigir(
      interessados.every((it) => !it.cpf || cpfValido(it.cpf)),
      "CPF de interessado inválido — confira o número digitado."
    );

  const [cliente, servico] = await Promise.all([
    clienteId ? db.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1) : Promise.resolve([]),
    servicoId ? db.select().from(servicos).where(eq(servicos.id, servicoId)).limit(1) : Promise.resolve([]),
  ]);

  validador
    .exigir(cliente.length === 1, "Cliente não encontrado.")
    .exigir(servico.length === 1, "Serviço não encontrado.");

  // Processos precisam existir e pertencer ao cliente escolhido.
  if (processoIds.length > 0 && clienteId) {
    const processosDoCliente = await db
      .select({ id: processos.id })
      .from(processos)
      .where(and(inArray(processos.id, processoIds), eq(processos.clienteId, clienteId)));
    if (processosDoCliente.length !== processoIds.length) {
      validador.exigir(false, "Um dos processos selecionados não pertence ao cliente escolhido.");
    }
  }

  const erro = validador.erro;
  if (erro || !dataHora || !clienteId || !servicoId || !repId) {
    return { erro: erro ?? "Dados inválidos.", valores };
  }

  // Título: se vazio, deriva de serviço + cliente para o calendário ficar legível.
  const titulo =
    String(formData.get("titulo") ?? "").trim() ||
    `${tipo === "prova" ? "Prova" : "Atendimento"} — ${servico[0].nome} · ${cliente[0].nome}`;

  return {
    dados: {
      titulo,
      dataHora,
      tipo,
      clienteId,
      servicoId,
      representanteLegalId: repId,
      local: String(formData.get("local") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      processoIds,
      interessados,
    },
  };
}

/** Entry única do form: decide criar ou atualizar pela presença do campo `id`. */
export async function salvarAgendamento(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "");
  if (UUID_RE.test(id)) return atualizarAgendamento(_estadoAnterior, formData);
  return criarAgendamento(_estadoAnterior, formData);
}

export async function criarAgendamento(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const { erro, valores, dados } = await extrairDadosAgendamento(formData);
  if (erro || !dados) return { erro, valores };

  const [evento] = await db
    .insert(agendaEventos)
    .values({
      clienteId: dados.clienteId,
      servicoId: dados.servicoId,
      representanteLegalId: dados.representanteLegalId,
      titulo: dados.titulo,
      dataHora: dados.dataHora,
      tipo: dados.tipo,
      local: dados.local,
      observacoes: dados.observacoes,
    })
    .returning({ id: agendaEventos.id });

  if (dados.processoIds.length > 0) {
    await db.insert(agendamentoProcessos).values(
      dados.processoIds.map((processoId, idx) => ({
        agendamentoId: evento.id,
        processoId,
        ordem: idx + 1,
      }))
    );
  }

  if (dados.interessados.length > 0) {
    await db.insert(agendaInteressados).values(
      dados.interessados.map((it) => ({
        eventoId: evento.id,
        nomeInteressado: it.nome,
        cpfInteressado: it.cpf,
        servicoSolicitado: it.servicoSolicitado,
        observacao: it.observacao,
      }))
    );
  }

  // Prova agendada → avisa o cliente na hora (comportamento preservado do fluxo antigo).
  if (dados.tipo === "prova") {
    const [cliente] = await db.select().from(clientes).where(eq(clientes.id, dados.clienteId)).limit(1);
    if (cliente?.email) {
      try {
        await enviarEmail({
          to: cliente.email,
          subject: `Sua prova foi agendada — ${dados.titulo}`,
          html: `<p>Olá ${cliente.nome},</p><p>Sua inscrição em <strong>${dados.titulo}</strong> foi confirmada. A prova está marcada para <strong>${dados.dataHora.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" })}</strong>.</p><p>Sparapan Solução Naval</p>`,
        });
      } catch {
        // Falha de e-mail não impede o agendamento de existir.
      }
    }
  }

  await registrarAuditoria("criar", "agenda_evento", evento.id, `${dados.titulo} (${dados.tipo})`);
  redirect(`/agenda/agendamentos/${evento.id}`);
}

export async function atualizarAgendamento(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const id = String(formData.get("id") ?? "");
  if (!UUID_RE.test(id)) return { erro: "Agendamento inválido." };

  const { erro, valores, dados } = await extrairDadosAgendamento(formData);
  if (erro || !dados) return { erro, valores };

  await db
    .update(agendaEventos)
    .set({
      clienteId: dados.clienteId,
      servicoId: dados.servicoId,
      representanteLegalId: dados.representanteLegalId,
      titulo: dados.titulo,
      dataHora: dados.dataHora,
      tipo: dados.tipo,
      local: dados.local,
      observacoes: dados.observacoes,
      atualizadoEm: new Date(),
    })
    .where(eq(agendaEventos.id, id));

  // Substituição completa dos vínculos — idempotente.
  await db.delete(agendamentoProcessos).where(eq(agendamentoProcessos.agendamentoId, id));
  if (dados.processoIds.length > 0) {
    await db.insert(agendamentoProcessos).values(
      dados.processoIds.map((processoId, idx) => ({
        agendamentoId: id,
        processoId,
        ordem: idx + 1,
      }))
    );
  }

  await db.delete(agendaInteressados).where(eq(agendaInteressados.eventoId, id));
  if (dados.interessados.length > 0) {
    await db.insert(agendaInteressados).values(
      dados.interessados.map((it) => ({
        eventoId: id,
        nomeInteressado: it.nome,
        cpfInteressado: it.cpf,
        servicoSolicitado: it.servicoSolicitado,
        observacao: it.observacao,
      }))
    );
  }

  await registrarAuditoria("atualizar", "agenda_evento", id, dados.titulo);
  redirect(`/agenda/agendamentos/${id}`);
}

export async function excluirAgendamento(agendamentoId: string) {
  const [evento] = await db
    .select({ titulo: agendaEventos.titulo })
    .from(agendaEventos)
    .where(eq(agendaEventos.id, agendamentoId))
    .limit(1);

  // Interessados e processos vinculados caem em cascata (FK onDelete cascade).
  await db.delete(agendaEventos).where(eq(agendaEventos.id, agendamentoId));
  await registrarAuditoria("excluir", "agenda_evento", agendamentoId, evento?.titulo);
  redirect("/agenda/agendamentos");
}

export async function confirmarAgendamento(agendamentoId: string) {
  await db.update(agendaEventos).set({ status: "confirmado" }).where(eq(agendaEventos.id, agendamentoId));
  await registrarAuditoria("alterar_status", "agenda_evento", agendamentoId, "confirmado");
  redirect(`/agenda/agendamentos/${agendamentoId}`);
}

export async function concluirAgendamento(agendamentoId: string) {
  await db.update(agendaEventos).set({ status: "concluido" }).where(eq(agendaEventos.id, agendamentoId));
  await registrarAuditoria("alterar_status", "agenda_evento", agendamentoId, "concluído");
  redirect(`/agenda/agendamentos/${agendamentoId}`);
}

/** Criação rápida de representante legal direto do form de agendamento (padrão inline do sistema). */
export async function criarRepresentanteLegal(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm & { representante?: { id: string; nome: string } }> {
  const nome = String(formData.get("repNovoNome") ?? "").trim();
  const cpf = String(formData.get("repNovoCpf") ?? "").trim();
  const observacoes = String(formData.get("repNovoObservacoes") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome do representante legal.")
    .sePreenchido(cpf, cpfValido, "CPF do representante inválido.").erro;
  if (erro) return { erro, valores };

  const [rep] = await db
    .insert(representantesLegais)
    .values({ nome, cpf: cpf || null, observacoes: observacoes || null })
    .returning({ id: representantesLegais.id, nome: representantesLegais.nome });

  await registrarAuditoria("criar", "representante_legal", rep.id, nome);
  return { representante: { id: rep.id, nome: rep.nome } };
}
