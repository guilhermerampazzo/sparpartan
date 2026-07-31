"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, embarcacoes, processos, orcamentos, obras } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { criarSolicitacao } from "@/lib/solicitacoes";
import {
  Validador,
  cpfCnpjValido,
  emailValido,
  ufValida,
  dataNoPassado,
  valoresDoFormData,
  type EstadoForm,
} from "@/lib/validacao";

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
