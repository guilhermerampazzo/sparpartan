"use server";

import { redirect } from "next/navigation";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, embarcacoes, processos, orcamentos, obras, servicos, arquivos } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { criarSolicitacao } from "@/lib/solicitacoes";
import { reclassificarProcesso } from "@/lib/processos";
import { hojeMais } from "@/lib/pendencias";
import { criarPendencias } from "@/lib/pendencias-db";
import { validarArquivo } from "@/lib/upload";
import {
  Validador,
  cpfCnpjValido,
  emailValido,
  ufValida,
  dataNoPassado,
  valoresDoFormData,
  type EstadoForm,
} from "@/lib/validacao";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

function opt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

function uuidValido(valor: string | null): string | null {
  if (!valor) return null;
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(valor)
    ? valor
    : null;
}

/** Salva o documento anexado pelo OCR (CNH Digital etc.) na pasta de arquivos do cliente. */
async function salvarDocumentoOcr(clienteId: string, formData: FormData) {
  const arquivo = formData.get("documentoOcr") as File | null;
  if (!arquivo || arquivo.size === 0) return;

  const erroArquivo = validarArquivo(arquivo);
  if (erroArquivo) throw new Error(erroArquivo);

  const clienteDir = path.join(uploadsDir(), "clientes", clienteId);
  await mkdir(clienteDir, { recursive: true });

  const extensao = path.extname(arquivo.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(clienteDir, nomeArquivo), bytes);

  const tipo = arquivo.name.toLowerCase().includes("cnh")
    ? "CNH"
    : arquivo.name.toLowerCase().includes("rg")
      ? "RG"
      : "outro";

  await db.insert(arquivos).values({
    clienteId,
    tipo,
    nomeOriginal: arquivo.name,
    caminho: path.join("clientes", clienteId, nomeArquivo),
  });
}

export async function criarCliente(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cpfCnpj = String(formData.get("cpfCnpj") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const uf = String(formData.get("uf") ?? "").trim();
  const dataNascimento = String(formData.get("dataNascimento") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome.")
    .exigir(!!cpfCnpj, "Informe o CPF ou CNPJ.")
    .sePreenchido(cpfCnpj, cpfCnpjValido, "CPF/CNPJ inválido — confira os dígitos.")
    .sePreenchido(email, emailValido, "E-mail inválido.")
    .sePreenchido(uf, ufValida, "UF inválida (use a sigla, ex: SP).")
    .sePreenchido(dataNascimento, dataNoPassado, "Data de nascimento não pode ser no futuro.").erro;

  if (erro) return { erro, valores };

  const [jaExiste] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.cpfCnpj, cpfCnpj))
    .limit(1);
  if (jaExiste) return { erro: "Já existe um cliente com esse CPF/CNPJ.", valores };

  const [cliente] = await db
    .insert(clientes)
    .values({
      nome,
      tipo: String(formData.get("tipo") ?? "pessoa_fisica") as "pessoa_fisica" | "pessoa_juridica",
      cpfCnpj,
      rg: String(formData.get("rg") ?? "") || null,
      dataNascimento: String(formData.get("dataNascimento") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      telefone: String(formData.get("telefone") ?? "") || null,
      celular: String(formData.get("celular") ?? "") || null,
      cep: String(formData.get("cep") ?? "") || null,
      rua: String(formData.get("rua") ?? "") || null,
      numero: String(formData.get("numero") ?? "") || null,
      complemento: String(formData.get("complemento") ?? "") || null,
      bairro: String(formData.get("bairro") ?? "") || null,
      cidade: String(formData.get("cidade") ?? "") || null,
      uf: String(formData.get("uf") ?? "") || null,
      indicadoPor: String(formData.get("indicadoPor") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      criadoPorId: await idUsuarioEquipe(),
    })
    .returning({ id: clientes.id });

  await registrarAuditoria("criar", "cliente", cliente.id, nome);

  // Documento anexado no OCR (CNH Digital etc.) vai direto para a pasta do cliente.
  await salvarDocumentoOcr(cliente.id, formData);

  // Fluidez do cadastro: se o operador já informou a embarcação e/ou o serviço
  // solicitado junto com o cliente, o sistema vincula tudo na hora.
  let embarcacaoId: string | null = null;
  const nomeEmbarcacao = opt(formData, "embarcacaoNome");
  if (nomeEmbarcacao) {
    const [embarcacao] = await db
      .insert(embarcacoes)
      .values({
        clienteId: cliente.id,
        nome: nomeEmbarcacao,
        tipo: opt(formData, "embarcacaoTipo"),
        numeroInscricao: opt(formData, "embarcacaoNumeroInscricao"),
        classe:
          (opt(formData, "embarcacaoClasse") as "esporte_recreio" | "comercial" | null) ?? "esporte_recreio",
        criadoPorId: await idUsuarioEquipe(),
      })
      .returning({ id: embarcacoes.id });
    embarcacaoId = embarcacao.id;
    await registrarAuditoria("criar", "embarcacao", embarcacao.id, nomeEmbarcacao);
  }

  const servicoId = uuidValido(opt(formData, "servicoSolicitadoId"));
  if (servicoId) {
    const [servico] = await db
      .select({ categoria: servicos.categoria })
      .from(servicos)
      .where(eq(servicos.id, servicoId))
      .limit(1);
    if (servico) {
      const [processo] = await db
        .insert(processos)
        .values({
          clienteId: cliente.id,
          servicoId,
          embarcacaoId,
          criadoPorId: await idUsuarioEquipe(),
        })
        .returning({ id: processos.id });

      await reclassificarProcesso(processo.id);
      await registrarAuditoria("criar", "processo", processo.id, servicoId);

      // A Central de Pendências conduz o trabalho gerado pelo novo atendimento.
      await criarPendencias([
        {
          descricao: "Conferir documentação do processo",
          categoria: "processos",
          prioridade: "media",
          data: hojeMais(1),
          clienteId: cliente.id,
          processoId: processo.id,
          origem: "auto",
          criadoPorId: await idUsuarioEquipe(),
        },
        {
          descricao: "Emitir anexos do processo",
          categoria: "processos",
          prioridade: "media",
          data: hojeMais(1),
          clienteId: cliente.id,
          processoId: processo.id,
          origem: "auto",
          criadoPorId: await idUsuarioEquipe(),
        },
        {
          descricao: "Protocolar processo",
          categoria: "processos",
          prioridade: "alta",
          data: hojeMais(3),
          clienteId: cliente.id,
          processoId: processo.id,
          origem: "auto",
          criadoPorId: await idUsuarioEquipe(),
        },
      ]);
    }
  }

  redirect("/clientes");
}

export type EstadoClienteRapido =
  | { erro: string; valores?: Record<string, string> }
  | { erro?: undefined; cliente: { id: string; nome: string } }
  | null;

/**
 * Cadastro mínimo usado no "+ Novo cliente" inline do formulário de orçamento —
 * não redireciona, devolve o cliente criado pro form que chamou.
 */
export async function criarClienteRapido(
  _estadoAnterior: EstadoClienteRapido,
  formData: FormData
): Promise<EstadoClienteRapido> {
  const nome = String(formData.get("clienteNovoNome") ?? "").trim();
  const cpfCnpj = String(formData.get("clienteNovoCpfCnpj") ?? "").trim();
  const email = String(formData.get("clienteNovoEmail") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome.")
    .exigir(!!cpfCnpj, "Informe o CPF ou CNPJ.")
    .sePreenchido(cpfCnpj, cpfCnpjValido, "CPF/CNPJ inválido — confira os dígitos.")
    .sePreenchido(email, emailValido, "E-mail inválido.").erro;

  if (erro) return { erro, valores };

  const [jaExiste] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.cpfCnpj, cpfCnpj))
    .limit(1);
  if (jaExiste) return { erro: "Já existe um cliente com esse CPF/CNPJ.", valores };

  const [cliente] = await db
    .insert(clientes)
    .values({
      nome,
      cpfCnpj,
      email: email || null,
      telefone: String(formData.get("clienteNovoTelefone") ?? "").trim() || null,
      criadoPorId: await idUsuarioEquipe(),
    })
    .returning({ id: clientes.id, nome: clientes.nome });

  await registrarAuditoria("criar", "cliente", cliente.id, nome);

  return { cliente };
}

export async function atualizarCliente(
  clienteId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const cpfCnpj = String(formData.get("cpfCnpj") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const uf = String(formData.get("uf") ?? "").trim();
  const dataNascimento = String(formData.get("dataNascimento") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome.")
    .exigir(!!cpfCnpj, "Informe o CPF ou CNPJ.")
    .sePreenchido(cpfCnpj, cpfCnpjValido, "CPF/CNPJ inválido — confira os dígitos.")
    .sePreenchido(email, emailValido, "E-mail inválido.")
    .sePreenchido(uf, ufValida, "UF inválida (use a sigla, ex: SP).")
    .sePreenchido(dataNascimento, dataNoPassado, "Data de nascimento não pode ser no futuro.").erro;

  if (erro) return { erro, valores };

  const [jaExiste] = await db
    .select({ id: clientes.id })
    .from(clientes)
    .where(eq(clientes.cpfCnpj, cpfCnpj))
    .limit(1);
  if (jaExiste && jaExiste.id !== clienteId) {
    return { erro: "Já existe um cliente com esse CPF/CNPJ.", valores };
  }

  await db
    .update(clientes)
    .set({
      nome,
      tipo: String(formData.get("tipo") ?? "pessoa_fisica") as "pessoa_fisica" | "pessoa_juridica",
      cpfCnpj,
      rg: String(formData.get("rg") ?? "") || null,
      dataNascimento: String(formData.get("dataNascimento") ?? "") || null,
      email: String(formData.get("email") ?? "") || null,
      telefone: String(formData.get("telefone") ?? "") || null,
      celular: String(formData.get("celular") ?? "") || null,
      cep: String(formData.get("cep") ?? "") || null,
      rua: String(formData.get("rua") ?? "") || null,
      numero: String(formData.get("numero") ?? "") || null,
      complemento: String(formData.get("complemento") ?? "") || null,
      bairro: String(formData.get("bairro") ?? "") || null,
      cidade: String(formData.get("cidade") ?? "") || null,
      uf: String(formData.get("uf") ?? "") || null,
      indicadoPor: String(formData.get("indicadoPor") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
      atualizadoEm: new Date(),
    })
    .where(eq(clientes.id, clienteId));

  await registrarAuditoria("atualizar", "cliente", clienteId, nome);

  redirect(`/clientes/${clienteId}`);
}

export async function excluirCliente(clienteId: string) {
  await db.transaction(async (tx) => {
    const agora = new Date();
    await tx.update(clientes).set({ excluidoEm: agora }).where(eq(clientes.id, clienteId));
    await tx
      .update(embarcacoes)
      .set({ excluidoEm: agora, ativo: false })
      .where(eq(embarcacoes.clienteId, clienteId));
    await tx
      .update(processos)
      .set({ excluidoEm: agora })
      .where(eq(processos.clienteId, clienteId));
    await tx
      .update(orcamentos)
      .set({ excluidoEm: agora })
      .where(eq(orcamentos.clienteId, clienteId));
    await tx.update(obras).set({ excluidoEm: agora }).where(eq(obras.clienteId, clienteId));
  });
  await registrarAuditoria("excluir", "cliente", clienteId, "exclusão em cascata (embarcações/processos/orçamentos/obras)");
  redirect("/clientes");
}

export async function restaurarCliente(clienteId: string) {
  await db.transaction(async (tx) => {
    await tx.update(clientes).set({ excluidoEm: null }).where(eq(clientes.id, clienteId));
    await tx
      .update(embarcacoes)
      .set({ excluidoEm: null, ativo: true })
      .where(eq(embarcacoes.clienteId, clienteId));
    await tx.update(processos).set({ excluidoEm: null }).where(eq(processos.clienteId, clienteId));
    await tx.update(orcamentos).set({ excluidoEm: null }).where(eq(orcamentos.clienteId, clienteId));
    await tx.update(obras).set({ excluidoEm: null }).where(eq(obras.clienteId, clienteId));
  });
  await registrarAuditoria("atualizar", "cliente", clienteId, "restaurado da lixeira (em cascata)");
  redirect("/clientes/lixeira");
}

export async function gerarLinkCadastroNovoCliente() {
  const token = await criarSolicitacao({ tipo: "cadastro_cliente" });
  redirect(`/clientes?link=${token}`);
}
