"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, and, gte, asc } from "drizzle-orm";
import { db } from "@/db";
import { criarSolicitacao } from "@/lib/solicitacoes";
import { pendenciasDoProcesso, reclassificarProcesso, STATUS_PROCESSO_VALIDOS } from "@/lib/processos";
import {
  processos,
  documentosGerados,
  clientes,
  servicos,
  agendaEventos,
} from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { enviarEmail } from "@/lib/mail/adapter";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";
import { validarArquivo } from "@/lib/upload";
import { hojeMais } from "@/lib/pendencias";
import { criarPendencias } from "@/lib/pendencias-db";
import { registrarNoChat } from "@/lib/chat-sistema";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

export async function criarProcesso(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const modoCliente = String(formData.get("modoCliente") ?? "existente");
  const servicoId = String(formData.get("servicoId") ?? "");
  const embarcacaoId = String(formData.get("embarcacaoId") ?? "") || null;
  const valores = valoresDoFormData(formData);

  let clienteId = String(formData.get("clienteId") ?? "");

  if (modoCliente === "novo") {
    const nomeNovoCliente = String(formData.get("clienteNovoNome") ?? "").trim();
    const cpfCnpjNovoCliente = String(formData.get("clienteNovoCpfCnpj") ?? "").trim();

    const erroCliente = new Validador()
      .exigir(!!nomeNovoCliente, "Informe o nome do novo cliente.")
      .exigir(!!cpfCnpjNovoCliente, "Informe o CPF/CNPJ do novo cliente.")
      .exigir(!!servicoId, "Selecione o serviço.").erro;
    if (erroCliente) return { erro: erroCliente, valores };

    const [jaExiste] = await db
      .select({ id: clientes.id })
      .from(clientes)
      .where(eq(clientes.cpfCnpj, cpfCnpjNovoCliente))
      .limit(1);
    if (jaExiste) {
      return { erro: "Já existe um cliente com esse CPF/CNPJ. Use a busca de cliente existente.", valores };
    }

    const [novoCliente] = await db
      .insert(clientes)
      .values({
        nome: nomeNovoCliente,
        cpfCnpj: cpfCnpjNovoCliente,
        telefone: String(formData.get("clienteNovoTelefone") ?? "") || null,
      })
      .returning({ id: clientes.id });
    clienteId = novoCliente.id;
    await registrarAuditoria("criar", "cliente", clienteId, nomeNovoCliente);
  } else {
    const erro = new Validador()
      .exigir(!!clienteId, "Selecione o cliente.")
      .exigir(!!servicoId, "Selecione o serviço.").erro;
    if (erro) return { erro, valores };
  }

  const responsavelId = String(formData.get("responsavelId") ?? "") || null;

  const [processo] = await db
    .insert(processos)
    .values({ clienteId, servicoId, embarcacaoId, responsavelId, criadoPorId: await idUsuarioEquipe() })
    .returning({ id: processos.id });

  await reclassificarProcesso(processo.id);

  // Criação automática de pendências — a Central conduz o trabalho em vez de depender
  // da memória da equipe.
  await criarPendencias([
    {
      descricao: "Conferir documentação do processo",
      categoria: "processos",
      prioridade: "media",
      data: hojeMais(1),
      clienteId,
      processoId: processo.id,
      responsavelId,
      origem: "auto",
      criadoPorId: await idUsuarioEquipe(),
    },
    {
      descricao: "Emitir anexos do processo",
      categoria: "processos",
      prioridade: "media",
      data: hojeMais(1),
      clienteId,
      processoId: processo.id,
      responsavelId,
      origem: "auto",
      criadoPorId: await idUsuarioEquipe(),
    },
    {
      descricao: "Protocolar processo",
      categoria: "processos",
      prioridade: "alta",
      data: hojeMais(3),
      clienteId,
      processoId: processo.id,
      responsavelId,
      origem: "auto",
      criadoPorId: await idUsuarioEquipe(),
    },
    {
      descricao: "Acompanhar andamento do processo",
      categoria: "processos",
      prioridade: "media",
      data: hojeMais(7),
      clienteId,
      processoId: processo.id,
      responsavelId,
      origem: "auto",
      criadoPorId: await idUsuarioEquipe(),
    },
    {
      descricao: "Entregar documentação ao cliente",
      categoria: "processos",
      prioridade: "baixa",
      data: hojeMais(10),
      clienteId,
      processoId: processo.id,
      responsavelId,
      origem: "auto",
      criadoPorId: await idUsuarioEquipe(),
    },
  ]);

  redirect(`/processos/${processo.id}`);
}

export async function protocolarProcesso(processoId: string, formData: FormData) {
  const numeroProtocolo = String(formData.get("numeroProtocolo") ?? "").trim();
  if (!numeroProtocolo) throw new Error("Número do protocolo é obrigatório");

  const [processo] = await db.select().from(processos).where(eq(processos.id, processoId)).limit(1);
  if (!processo) throw new Error("Processo não encontrado");
  if (!processo.embarcacaoId) {
    throw new Error("Vincule uma embarcação ao cliente/processo antes de protocolar.");
  }

  const faltando = await pendenciasDoProcesso(processoId);
  if (faltando.length > 0) {
    throw new Error(`Documentos obrigatórios faltando: ${faltando.map((p) => p.nome).join(", ")}`);
  }

  let protocoloEscaneadoCaminho: string | null = null;
  const comprovante = formData.get("comprovante") as File | null;
  if (comprovante && comprovante.size > 0) {
    const erroArquivo = validarArquivo(comprovante);
    if (erroArquivo) throw new Error(erroArquivo);

    const processosDir = path.join(uploadsDir(), "processos", processoId);
    await mkdir(processosDir, { recursive: true });
    const extensao = path.extname(comprovante.name) || ".pdf";
    const nomeArquivo = `protocolo-${randomUUID()}${extensao}`;
    const bytes = Buffer.from(await comprovante.arrayBuffer());
    await writeFile(path.join(processosDir, nomeArquivo), bytes);
    protocoloEscaneadoCaminho = path.join("processos", processoId, nomeArquivo);
  }

  await db
    .update(processos)
    .set({
      status: "protocolado",
      numeroProtocolo,
      dataProtocolo: String(formData.get("dataProtocolo") ?? "") || null,
      ...(protocoloEscaneadoCaminho ? { protocoloEscaneadoCaminho } : {}),
      atualizadoEm: new Date(),
    })
    .where(eq(processos.id, processoId));

  await db
    .update(documentosGerados)
    .set({ status: "protocolado" })
    .where(and(eq(documentosGerados.processoId, processoId), eq(documentosGerados.status, "gerado")));

  await registrarAuditoria("atualizar", "processo", processoId, `protocolado sob nº ${numeroProtocolo}`);

  await notificarClienteProtocolo(processoId, numeroProtocolo);

  const [clienteDoProcesso] = await db
    .select({ nome: clientes.nome })
    .from(clientes)
    .where(eq(clientes.id, processo.clienteId))
    .limit(1);
  const [servicoDoProcesso] = await db
    .select({ nome: servicos.nome })
    .from(servicos)
    .where(eq(servicos.id, processo.servicoId))
    .limit(1);
  await registrarNoChat(
    `Processo protocolado — nº ${numeroProtocolo} (${servicoDoProcesso?.nome ?? "serviço"} de ${clienteDoProcesso?.nome ?? "cliente"}).`
  );

  redirect(`/processos/${processoId}`);
}

async function notificarClienteProtocolo(processoId: string, numeroProtocolo: string) {
  const [processo] = await db.select().from(processos).where(eq(processos.id, processoId)).limit(1);
  if (!processo) return;

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, processo.clienteId)).limit(1);
  if (!cliente?.email) return;

  const [servico] = await db.select().from(servicos).where(eq(servicos.id, processo.servicoId)).limit(1);

  let mensagemProva = "";
  if (servico?.categoria === "escola") {
    const [proximaProva] = await db
      .select()
      .from(agendaEventos)
      .where(
        and(
          eq(agendaEventos.clienteId, cliente.id),
          eq(agendaEventos.tipo, "prova"),
          gte(agendaEventos.dataHora, new Date())
        )
      )
      .orderBy(asc(agendaEventos.dataHora))
      .limit(1);

    if (proximaProva) {
      const dataFormatada = new Date(proximaProva.dataHora).toLocaleString("pt-BR", {
        dateStyle: "long",
        timeStyle: "short",
      });
      mensagemProva = `<p>Sua prova está marcada para <strong>${dataFormatada}</strong>.</p>`;
    }
  }

  try {
    await enviarEmail({
      to: cliente.email,
      subject: `Processo protocolado — nº ${numeroProtocolo}`,
      html: `<p>Olá ${cliente.nome},</p><p>Seu processo &quot;${servico?.nome ?? ""}&quot; foi protocolado sob o número <strong>${numeroProtocolo}</strong>.</p>${mensagemProva}<p>Sparapan Solução Naval</p>`,
    });
  } catch {
    // Falha de e-mail não deve travar o protocolo — a equipe já viu o número na tela.
  }
}

export async function definirEmbarcacao(processoId: string, formData: FormData) {
  const embarcacaoId = String(formData.get("embarcacaoId") ?? "") || null;

  await db
    .update(processos)
    .set({ embarcacaoId, atualizadoEm: new Date() })
    .where(eq(processos.id, processoId));

  redirect(`/processos/${processoId}`);
}

export async function concluirProcesso(processoId: string) {
  await db
    .update(processos)
    .set({ status: "concluido", atualizadoEm: new Date() })
    .where(eq(processos.id, processoId));

  redirect(`/processos/${processoId}`);
}

export async function cancelarProcesso(processoId: string) {
  const [processo] = await db.select().from(processos).where(eq(processos.id, processoId)).limit(1);
  if (!processo) throw new Error("Processo não encontrado");

  await db
    .update(processos)
    .set({ status: "cancelado", atualizadoEm: new Date() })
    .where(eq(processos.id, processoId));
  await registrarAuditoria("atualizar", "processo", processoId, "atendimento cancelado");

  revalidatePath(`/clientes/${processo.clienteId}`);
  revalidatePath("/processos");
  revalidatePath("/agenda");
  redirect(`/processos/${processoId}`);
}

/**
 * Mudança de status manual e fluida, direto do cadastro do cliente: o operador
 * acompanha o atendimento sem sair do cliente — marca protocolado (com número,
 * data e scan), conclui (com vencimento do documento) ou cancela se o cliente
 * desistiu. Não bloqueia por pendências: a equipe usa o checklist no processo
 * para conferir; aqui o controle de andamento é dela.
 */
export async function atualizarStatusProcesso(processoId: string, formData: FormData) {
  const status = String(formData.get("status") ?? "");
  if (!STATUS_PROCESSO_VALIDOS.includes(status as (typeof STATUS_PROCESSO_VALIDOS)[number])) {
    throw new Error("Status inválido.");
  }  const statusValido = status as (typeof STATUS_PROCESSO_VALIDOS)[number];

  const [processo] = await db.select().from(processos).where(eq(processos.id, processoId)).limit(1);
  if (!processo) throw new Error("Processo não encontrado");

  if (status === "protocolado") {
    const numeroProtocolo = String(formData.get("numeroProtocolo") ?? "").trim();
    if (!numeroProtocolo) throw new Error("Informe o número do protocolo.");

    let protocoloEscaneadoCaminho = processo.protocoloEscaneadoCaminho;
    const comprovante = formData.get("comprovante") as File | null;
    if (comprovante && comprovante.size > 0) {
      const erroArquivo = validarArquivo(comprovante);
      if (erroArquivo) throw new Error(erroArquivo);
      const processosDir = path.join(uploadsDir(), "processos", processoId);
      await mkdir(processosDir, { recursive: true });
      const extensao = path.extname(comprovante.name) || ".pdf";
      const nomeArquivo = `protocolo-${randomUUID()}${extensao}`;
      const bytes = Buffer.from(await comprovante.arrayBuffer());
      await writeFile(path.join(processosDir, nomeArquivo), bytes);
      protocoloEscaneadoCaminho = path.join("processos", processoId, nomeArquivo);
    }

    await db
      .update(processos)
      .set({
        status: "protocolado",
        numeroProtocolo,
        dataProtocolo:
          String(formData.get("dataProtocolo") ?? "").trim() || processo.dataProtocolo,
        ...(protocoloEscaneadoCaminho ? { protocoloEscaneadoCaminho } : {}),
        exigenciaObservacao: String(formData.get("exigenciaObservacao") ?? "").trim() || null,
        atualizadoEm: new Date(),
      })
      .where(eq(processos.id, processoId));

    await db
      .update(documentosGerados)
      .set({ status: "protocolado" })
      .where(and(eq(documentosGerados.processoId, processoId), eq(documentosGerados.status, "gerado")));

    await registrarAuditoria("atualizar", "processo", processoId, `protocolado sob nº ${numeroProtocolo}`);
  } else {
    await db
      .update(processos)
      .set({ status: statusValido, atualizadoEm: new Date() })
      .where(eq(processos.id, processoId));
    await registrarAuditoria("atualizar", "processo", processoId, `status → ${statusValido}`);
  }

  // Ao concluir, o operador informa quando o documento vence — vira acompanhamento
  // de vencimentos (a mesma data que aparece na listagem de documentos).
  if (status === "concluido") {
    const vencimento = String(formData.get("vencimentoDocumento") ?? "").trim();
    if (vencimento) {
      await db
        .update(documentosGerados)
        .set({ vencimento })
        .where(eq(documentosGerados.processoId, processoId));
    }
  }

  revalidatePath(`/clientes/${processo.clienteId}`);
  revalidatePath(`/processos/${processoId}`);
  revalidatePath("/processos");
  revalidatePath("/agenda");
}

export async function gerarLinkDocumentos(processoId: string) {
  const [processo] = await db.select().from(processos).where(eq(processos.id, processoId)).limit(1);
  if (!processo) throw new Error("Processo não encontrado");

  const token = await criarSolicitacao({
    tipo: "documentos_processo",
    processoId,
    clienteId: processo.clienteId,
  });
  redirect(`/processos/${processoId}?link=${token}`);
}

export async function gerarLinkAcompanhamento(processoId: string) {
  const [processo] = await db.select().from(processos).where(eq(processos.id, processoId)).limit(1);
  if (!processo) throw new Error("Processo não encontrado");

  const token = await criarSolicitacao({
    tipo: "acompanhamento_processo",
    processoId,
    clienteId: processo.clienteId,
  });
  redirect(`/processos/${processoId}?link=${token}`);
}
