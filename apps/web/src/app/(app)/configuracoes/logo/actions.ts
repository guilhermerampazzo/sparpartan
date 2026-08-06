"use server";

import { mkdir, readdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { revalidatePath } from "next/cache";

const EXTENSOES_LOGO = [".png", ".jpg", ".jpeg", ".webp", ".svg"];
const TAMANHO_MAX_LOGO = 2 * 1024 * 1024; // 2 MB

export type EstadoLogo = { erro?: string; ok?: string } | null;

function pastaLogo() {
  return path.join(process.env.UPLOADS_DIR ?? "./data/uploads", "logo");
}

/** Remove o logo personalizado atual (se houver) — usado antes de salvar o novo. */
async function limparLogoAtual() {
  try {
    const arquivos = await readdir(pastaLogo());
    for (const nome of arquivos) {
      if (!nome.startsWith(".")) await unlink(path.join(pastaLogo(), nome));
    }
  } catch {
    // pasta inexistente — nada a limpar
  }
}

export async function salvarLogo(
  _estadoAnterior: EstadoLogo,
  formData: FormData
): Promise<EstadoLogo> {
  const arquivo = formData.get("logo") as File | null;
  if (!arquivo || arquivo.size === 0) return { erro: "Selecione um arquivo de imagem." };

  if (arquivo.size > TAMANHO_MAX_LOGO) {
    return { erro: "A imagem deve ter no máximo 2 MB." };
  }

  const extensao = path.extname(arquivo.name).toLowerCase();
  if (!EXTENSOES_LOGO.includes(extensao)) {
    return { erro: "Formato não suportado. Use PNG, JPG, WEBP ou SVG." };
  }

  const dir = pastaLogo();
  await mkdir(dir, { recursive: true });
  await limparLogoAtual();

  const bytes = Buffer.from(await arquivo.arrayBuffer());
  await writeFile(path.join(dir, `logo${extensao}`), bytes);

  revalidatePath("/configuracoes/logo");
  return { ok: "Logo atualizado com sucesso." };
}

export async function removerLogo() {
  await limparLogoAtual();
  revalidatePath("/configuracoes/logo");
}
