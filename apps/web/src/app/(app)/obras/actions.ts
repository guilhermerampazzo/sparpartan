"use server";

import { randomUUID } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { db } from "@/db";
import { obras, obraFotos } from "@/db/schema";
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

export async function criarObra(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const clienteId = String(formData.get("clienteId") ?? "");
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!clienteId, "Selecione o cliente.").erro;
  if (erro) return { erro, valores };

  const [obra] = await db
    .insert(obras)
    .values({
      clienteId,
      idObra: opt(formData, "idObra"),
      titulo: opt(formData, "titulo"),
      tipoObra: opt(formData, "tipoObra"),
      itemObraCodigo: opt(formData, "itemObraCodigo"),
      descricaoObra: opt(formData, "descricaoObra"),
      normamDeUso: opt(formData, "normamDeUso"),
      cpDlAg: opt(formData, "cpDlAg"),
      respTecnico: opt(formData, "respTecnico"),
      nCrea: opt(formData, "nCrea"),
      engenheiroId: opt(formData, "engenheiroId"),
      endereco: opt(formData, "endereco"),
      rioLocalizado: opt(formData, "rioLocalizado"),
      distanciaRioKm: opt(formData, "distanciaRioKm"),
      areaNavegacao: opt(formData, "areaNavegacao"),
      atividade: opt(formData, "atividade"),
      pontoA: opt(formData, "pontoA"),
      pontoB: opt(formData, "pontoB"),
      pontoC: opt(formData, "pontoC"),
      pontoD: opt(formData, "pontoD"),
      comprimento: opt(formData, "comprimento"),
      largura: opt(formData, "largura"),
      areaConstruida: opt(formData, "areaConstruida"),
      apoiadoSobre: opt(formData, "apoiadoSobre"),
      estruturaCober: opt(formData, "estruturaCober"),
      matEstrutura: opt(formData, "matEstrutura"),
      matParedes: opt(formData, "matParedes"),
      matPiso: opt(formData, "matPiso"),
      matCobertura: opt(formData, "matCobertura"),
      listaMatConstrucaoDimensoes: opt(formData, "listaMatConstrucaoDimensoes"),
      fontEnergia: opt(formData, "fontEnergia"),
      banheiroSn: (opt(formData, "banheiroSn") as "sim" | "nao" | null) ?? undefined,
      piaOuOutros: opt(formData, "piaOuOutros"),
      caladoCar: opt(formData, "caladoCar"),
      caladoLeve: opt(formData, "caladoLeve"),
      deslCar: opt(formData, "deslCar"),
      deslLeve: opt(formData, "deslLeve"),
      pesoAdicional: opt(formData, "pesoAdicional"),
      cargaSuportada: opt(formData, "cargaSuportada"),
      lotacaoMax: opt(formData, "lotacaoMax") ? Number(opt(formData, "lotacaoMax")) : null,
      coletes: opt(formData, "coletes") ? Number(opt(formData, "coletes")) : null,
      boias: opt(formData, "boias") ? Number(opt(formData, "boias")) : null,
      matTambores: opt(formData, "matTambores"),
      qntTambores: opt(formData, "qntTambores") ? Number(opt(formData, "qntTambores")) : null,
      volumeTambores: opt(formData, "volumeTambores"),
      criadoPorId: await idUsuarioEquipe(),
    })
    .returning({ id: obras.id });

  await registrarAuditoria("criar", "obra", obra.id, opt(formData, "titulo") ?? "");

  redirect(`/obras/${obra.id}`);
}

export async function atualizarObra(
  obraId: string,
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const clienteId = String(formData.get("clienteId") ?? "");
  const valores = valoresDoFormData(formData);

  const erro = new Validador().exigir(!!clienteId, "Selecione o cliente.").erro;
  if (erro) return { erro, valores };

  await db
    .update(obras)
    .set({
      clienteId,
      idObra: opt(formData, "idObra"),
      titulo: opt(formData, "titulo"),
      tipoObra: opt(formData, "tipoObra"),
      itemObraCodigo: opt(formData, "itemObraCodigo"),
      descricaoObra: opt(formData, "descricaoObra"),
      normamDeUso: opt(formData, "normamDeUso"),
      cpDlAg: opt(formData, "cpDlAg"),
      respTecnico: opt(formData, "respTecnico"),
      nCrea: opt(formData, "nCrea"),
      engenheiroId: opt(formData, "engenheiroId"),
      endereco: opt(formData, "endereco"),
      rioLocalizado: opt(formData, "rioLocalizado"),
      distanciaRioKm: opt(formData, "distanciaRioKm"),
      areaNavegacao: opt(formData, "areaNavegacao"),
      atividade: opt(formData, "atividade"),
      pontoA: opt(formData, "pontoA"),
      pontoB: opt(formData, "pontoB"),
      pontoC: opt(formData, "pontoC"),
      pontoD: opt(formData, "pontoD"),
      comprimento: opt(formData, "comprimento"),
      largura: opt(formData, "largura"),
      areaConstruida: opt(formData, "areaConstruida"),
      apoiadoSobre: opt(formData, "apoiadoSobre"),
      estruturaCober: opt(formData, "estruturaCober"),
      matEstrutura: opt(formData, "matEstrutura"),
      matParedes: opt(formData, "matParedes"),
      matPiso: opt(formData, "matPiso"),
      matCobertura: opt(formData, "matCobertura"),
      listaMatConstrucaoDimensoes: opt(formData, "listaMatConstrucaoDimensoes"),
      fontEnergia: opt(formData, "fontEnergia"),
      banheiroSn: (opt(formData, "banheiroSn") as "sim" | "nao" | null) ?? undefined,
      piaOuOutros: opt(formData, "piaOuOutros"),
      caladoCar: opt(formData, "caladoCar"),
      caladoLeve: opt(formData, "caladoLeve"),
      deslCar: opt(formData, "deslCar"),
      deslLeve: opt(formData, "deslLeve"),
      pesoAdicional: opt(formData, "pesoAdicional"),
      cargaSuportada: opt(formData, "cargaSuportada"),
      lotacaoMax: opt(formData, "lotacaoMax") ? Number(opt(formData, "lotacaoMax")) : null,
      coletes: opt(formData, "coletes") ? Number(opt(formData, "coletes")) : null,
      boias: opt(formData, "boias") ? Number(opt(formData, "boias")) : null,
      matTambores: opt(formData, "matTambores"),
      qntTambores: opt(formData, "qntTambores") ? Number(opt(formData, "qntTambores")) : null,
      volumeTambores: opt(formData, "volumeTambores"),
      atualizadoEm: new Date(),
    })
    .where(eq(obras.id, obraId));

  await registrarAuditoria("atualizar", "obra", obraId, opt(formData, "titulo") ?? "");
  revalidatePath(`/obras/${obraId}`);
  redirect(`/obras/${obraId}`);
}

export async function enviarFotoObra(obraId: string, formData: FormData) {
  const arquivo = formData.get("foto") as File | null;
  if (!arquivo || arquivo.size === 0) throw new Error("Selecione uma foto.");

  const erroArquivo = validarArquivo(arquivo, "imagem");
  if (erroArquivo) throw new Error(erroArquivo);

  const obraDir = path.join(uploadsDir(), "obras", obraId);
  await mkdir(obraDir, { recursive: true });

  const extensao = path.extname(arquivo.name) || "";
  const nomeArquivo = `${randomUUID()}${extensao}`;
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(obraDir, nomeArquivo), bytes);

  await db.insert(obraFotos).values({
    obraId,
    caminho: path.join("obras", obraId, nomeArquivo),
  });

  revalidatePath(`/obras/${obraId}`);
}

export async function removerFotoObra(obraId: string, fotoId: string) {
  const [foto] = await db.select().from(obraFotos).where(eq(obraFotos.id, fotoId)).limit(1);
  if (foto) {
    await unlink(path.join(uploadsDir(), foto.caminho)).catch(() => {});
    await db.delete(obraFotos).where(eq(obraFotos.id, fotoId));
  }
  revalidatePath(`/obras/${obraId}`);
}

export async function excluirObra(obraId: string) {
  await db
    .update(obras)
    .set({ excluidoEm: new Date() })
    .where(eq(obras.id, obraId));
  await registrarAuditoria("excluir", "obra", obraId, "obra excluída");
  revalidatePath("/obras");
}
