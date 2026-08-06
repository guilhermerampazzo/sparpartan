"use server";

import { randomUUID, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { alunos, matriculas, materias, enviosEmail } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { enviarEmail } from "@/lib/mail/adapter";
import { Validador, emailValido, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

function gerarSenhaInicial() {
  return randomBytes(6).toString("base64url");
}

function montarEmailBoasVindas(nome: string, email: string, senha: string) {
  const url = process.env.AUTH_URL || "http://localhost:8080";
  return {
    assunto: "Bem-vindo à Área de Estudos",
    html:
      `<p>Olá ${nome},</p>` +
      `<p>Sua conta na Área de Estudos foi criada. Use os dados abaixo para acessar:</p>` +
      `<p><b>E-mail:</b> ${email}<br><b>Senha inicial:</b> ${senha}</p>` +
      `<p>Acesse em <a href="${url}/aluno/login">${url}/aluno/login</a> e recomendamos trocar a senha após o primeiro login.</p>` +
      `<p>Abraços,<br>Sparapan Solução Naval</p>`,
  };
}

export async function criarAluno(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const nome = String(formData.get("nome") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const telefone = String(formData.get("telefone") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!nome, "Informe o nome do aluno.")
    .exigir(!!email, "Informe o e-mail do aluno.")
    .sePreenchido(email, emailValido, "E-mail inválido.").erro;
  if (erro) return { erro, valores };

  const [existente] = await db.select().from(alunos).where(eq(alunos.email, email)).limit(1);
  if (existente) return { erro: "Já existe um aluno com esse e-mail.", valores };

  const senhaInicial = gerarSenhaInicial();
  const senhaHash = await bcrypt.hash(senhaInicial, 10);

  const [aluno] = await db
    .insert(alunos)
    .values({
      nome,
      email,
      senhaHash,
      telefone: telefone || null,
      cidade: cidade || null,
    })
    .returning({ id: alunos.id });

  await registrarAuditoria("criar", "aluno", aluno.id, nome);

  const { assunto, html } = montarEmailBoasVindas(nome, email, senhaInicial);
  let status: "enviado" | "falhou" = "enviado";
  let erroEnvio: string | null = null;
  try {
    await enviarEmail({ to: email, subject: assunto, html });
  } catch (e) {
    status = "falhou";
    erroEnvio = e instanceof Error ? e.message : String(e);
  }

  await db.insert(enviosEmail).values({
    destinatario: email,
    assunto,
    corpo: html,
    status,
    erro: erroEnvio,
  });

  redirect(`/alunos/${aluno.id}`);
}

export async function atualizarAluno(alunoId: string, formData: FormData) {
  const telefone = String(formData.get("telefone") ?? "").trim();
  const cidade = String(formData.get("cidade") ?? "").trim();
  const ativo = formData.get("ativo") === "on";

  await db
    .update(alunos)
    .set({ telefone: telefone || null, cidade: cidade || null, ativo })
    .where(eq(alunos.id, alunoId));

  await registrarAuditoria("atualizar", "aluno", alunoId);

  revalidatePath(`/alunos/${alunoId}`);
}

export async function concederAcesso(alunoId: string, formData: FormData) {
  const materiaId = String(formData.get("materiaId") ?? "").trim();
  const periodo = String(formData.get("periodo") ?? "sem_limite");
  const expiraEmStr = String(formData.get("expiraEm") ?? "").trim();

  if (!materiaId) throw new Error("Selecione a matéria.");

  const [materia] = await db.select().from(materias).where(eq(materias.id, materiaId)).limit(1);
  if (!materia) throw new Error("Matéria não encontrada.");

  const [jaMatriculado] = await db
    .select()
    .from(matriculas)
    .where(
      and(eq(matriculas.alunoId, alunoId), eq(matriculas.materiaId, materiaId), eq(matriculas.status, "ativo"))
    )
    .limit(1);
  if (jaMatriculado) throw new Error("Aluno já possui matrícula ativa nessa matéria.");

  let expiraEm: Date | null = null;
  if (periodo === "periodo") {
    if (!expiraEmStr) throw new Error("Informe a data de expiração.");
    expiraEm = new Date(expiraEmStr);
    if (Number.isNaN(expiraEm.getTime())) throw new Error("Data de expiração inválida.");
  }

  await db.insert(matriculas).values({
    alunoId,
    materiaId,
    expiraEm,
    status: "ativo",
    origem: "manual",
  });

  await registrarAuditoria("criar", "matricula", randomUUID(), `${alunoId} -> ${materia.titulo}`);

  revalidatePath(`/alunos/${alunoId}`);
}

export async function revogarAcesso(alunoId: string, matriculaId: string) {
  await db.update(matriculas).set({ status: "revogado" }).where(eq(matriculas.id, matriculaId));
  await registrarAuditoria("atualizar", "matricula", matriculaId, "revogada");
  revalidatePath(`/alunos/${alunoId}`);
}
