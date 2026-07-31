"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { embarcacoes, motores, aquisicoes, embarcacaoFotos } from "@/db/schema";
import { registrarAuditoria } from "@/lib/audit";
import { idUsuarioEquipe } from "@/lib/sessao";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";
import { validarArquivo } from "@/lib/upload";

function uploadsDir() {
  return process.env.UPLOADS_DIR ?? "./data/uploads";
}

function opt(formData: FormData, key: string) {
  const v = String(formData.get(key) ?? "").trim();
  return v || null;
}

function optNum(formData: FormData, key: string) {
  const v = opt(formData, key);
  return v === null ? null : v;
}

export async function criarEmbarcacao(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const clienteId = String(formData.get("clienteId") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!clienteId, "Selecione o cliente.")
    .exigir(!!nome, "Informe o nome da embarcação.").erro;

  if (erro) return { erro, valores };

  const [embarcacao] = await db
    .insert(embarcacoes)
    .values({
      clienteId,
      nome,
      nomeAnterior: opt(formData, "nomeAnterior"),
      numeroInscricao: opt(formData, "numeroInscricao"),
      tipo: opt(formData, "tipo"),
      atividade: opt(formData, "atividade"),
      areaNavegacao: opt(formData, "areaNavegacao"),
      comprimento: optNum(formData, "comprimento"),
      boca: optNum(formData, "boca"),
      pontal: optNum(formData, "pontal"),
      caladoMax: optNum(formData, "caladoMax"),
      arqueacaoBruta: optNum(formData, "arqueacaoBruta"),
      arqueacaoLiquida: optNum(formData, "arqueacaoLiquida"),
      pbt: optNum(formData, "pbt"),
      lpp: optNum(formData, "lpp"),
      tripulantes: optNum(formData, "tripulantes") ? Number(optNum(formData, "tripulantes")) : null,
      passageiros: optNum(formData, "passageiros") ? Number(optNum(formData, "passageiros")) : null,
      lotacao: optNum(formData, "lotacao") ? Number(optNum(formData, "lotacao")) : null,
      ano: optNum(formData, "ano") ? Number(optNum(formData, "ano")) : null,
      numeroCasco: opt(formData, "numeroCasco"),
      materialCasco: opt(formData, "materialCasco"),
      construtor: opt(formData, "construtor"),
      cor: opt(formData, "cor"),
      tipoPropulsao: opt(formData, "tipoPropulsao"),
      potenciaMotor: optNum(formData, "potenciaMotor"),
      numeroSerieMotor: opt(formData, "numeroSerieMotor"),
      classe:
        (opt(formData, "classe") as "esporte_recreio" | "comercial" | null) ?? "esporte_recreio",
      atividadeComercial: opt(formData, "atividadeComercial"),
      criadoPorId: await idUsuarioEquipe(),
    })
    .returning({ id: embarcacoes.id });

  for (let i = 1; i <= 3; i++) {
    const marca = opt(formData, `motor${i}Marca`);
    const potencia = opt(formData, `motor${i}Potencia`);
    const numeroSerie = opt(formData, `motor${i}NumeroSerie`);
    if (marca || potencia || numeroSerie) {
      await db.insert(motores).values({
        embarcacaoId: embarcacao.id,
        ordem: i,
        marca,
        potencia,
        numeroSerie,
      });
    }
  }

  const numeroNf = opt(formData, "numeroNf");
  const vendedor = opt(formData, "vendedor");
  if (numeroNf || vendedor) {
    await db.insert(aquisicoes).values({
      embarcacaoId: embarcacao.id,
      numeroNf,
      dataVenda: opt(formData, "dataVenda"),
      local: opt(formData, "localVenda"),
      vendedor,
      cpfCnpjVendedor: opt(formData, "cpfCnpjVendedor"),
      valor: optNum(formData, "valorVenda"),
    });
  }

  redirect("/embarcacoes");
}

export type EstadoEmbarcacaoRapida =
  | { erro: string; valores?: Record<string, string> }
  | { erro?: undefined; embarcacao: { id: string; nome: string } }
  | null;

/**
 * Cadastro mínimo usado no "+ Nova embarcação" inline do formulário de orçamento —
 * não redireciona, devolve a embarcação criada pro form que chamou.
 */
export async function criarEmbarcacaoRapida(
  _estadoAnterior: EstadoEmbarcacaoRapida,
  formData: FormData
): Promise<EstadoEmbarcacaoRapida> {
  const clienteId = String(formData.get("embarcacaoNovaClienteId") ?? "").trim();
  const nome = String(formData.get("embarcacaoNovaNome") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!clienteId, "Selecione o cliente.")
    .exigir(!!nome, "Informe o nome da embarcação.").erro;

  if (erro) return { erro, valores };

  const [embarcacao] = await db
    .insert(embarcacoes)
    .values({ clienteId, nome, criadoPorId: await idUsuarioEquipe() })
    .returning({ id: embarcacoes.id, nome: embarcacoes.nome });

  return { embarcacao };
}

export async function atualizarEmbarcacao(
  embarcacaoId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const clienteId = String(formData.get("clienteId") ?? "").trim();
  const nome = String(formData.get("nome") ?? "").trim();
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!clienteId, "Selecione o cliente.")
    .exigir(!!nome, "Informe o nome da embarcação.").erro;

  if (erro) return { erro, valores };

  await db
    .update(embarcacoes)
    .set({
      clienteId,
      nome,
      nomeAnterior: opt(formData, "nomeAnterior"),
      numeroInscricao: opt(formData, "numeroInscricao"),
      tipo: opt(formData, "tipo"),
      atividade: opt(formData, "atividade"),
      areaNavegacao: opt(formData, "areaNavegacao"),
      comprimento: optNum(formData, "comprimento"),
      boca: optNum(formData, "boca"),
      pontal: optNum(formData, "pontal"),
      caladoMax: optNum(formData, "caladoMax"),
      arqueacaoBruta: optNum(formData, "arqueacaoBruta"),
      arqueacaoLiquida: optNum(formData, "arqueacaoLiquida"),
      pbt: optNum(formData, "pbt"),
      lpp: optNum(formData, "lpp"),
      tripulantes: optNum(formData, "tripulantes") ? Number(optNum(formData, "tripulantes")) : null,
      passageiros: optNum(formData, "passageiros") ? Number(optNum(formData, "passageiros")) : null,
      lotacao: optNum(formData, "lotacao") ? Number(optNum(formData, "lotacao")) : null,
      ano: optNum(formData, "ano") ? Number(optNum(formData, "ano")) : null,
      numeroCasco: opt(formData, "numeroCasco"),
      materialCasco: opt(formData, "materialCasco"),
      construtor: opt(formData, "construtor"),
      cor: opt(formData, "cor"),
      tipoPropulsao: opt(formData, "tipoPropulsao"),
      potenciaMotor: optNum(formData, "potenciaMotor"),
      numeroSerieMotor: opt(formData, "numeroSerieMotor"),
      classe:
        (opt(formData, "classe") as "esporte_recreio" | "comercial" | null) ?? "esporte_recreio",
      atividadeComercial: opt(formData, "atividadeComercial"),
      atualizadoEm: new Date(),
    })
    .where(eq(embarcacoes.id, embarcacaoId));

  await registrarAuditoria("atualizar", "embarcacao", embarcacaoId, nome);
  revalidatePath(`/embarcacoes/${embarcacaoId}`);
  redirect(`/embarcacoes/${embarcacaoId}`);
}

export async function enviarFotoEmbarcacao(embarcacaoId: string, formData: FormData) {
  const arquivo = formData.get("foto") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione uma foto.");

  const erroArquivo = validarArquivo(arquivo, "imagem");
  if (erroArquivo) throw new Error(erroArquivo);

  const embarcacaoDir = path.join(uploadsDir(), "embarcacoes", embarcacaoId);
  await mkdir(embarcacaoDir, { recursive: true });

  const extensao = path.extname(arquivo.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(embarcacaoDir, nomeArquivo), bytes);

  await db.insert(embarcacaoFotos).values({
    embarcacaoId,
    caminho: path.join("embarcacoes", embarcacaoId, nomeArquivo),
  });

  revalidatePath(`/embarcacoes/${embarcacaoId}`);
}

export async function removerFotoEmbarcacao(embarcacaoId: string, fotoId: string) {
  const [foto] = await db
    .select()
    .from(embarcacaoFotos)
    .where(eq(embarcacaoFotos.id, fotoId))
    .limit(1);
  if (foto) {
    await unlink(path.join(uploadsDir(), foto.caminho)).catch(() => {});
    await db.delete(embarcacaoFotos).where(eq(embarcacaoFotos.id, fotoId));
  }
  revalidatePath(`/embarcacoes/${embarcacaoId}`);
}

export async function excluirEmbarcacao(embarcacaoId: string) {
  await db
    .update(embarcacoes)
    .set({ excluidoEm: new Date(), ativo: false })
    .where(eq(embarcacoes.id, embarcacaoId));
  await registrarAuditoria("excluir", "embarcacao", embarcacaoId, "");
  redirect("/embarcacoes");
}
