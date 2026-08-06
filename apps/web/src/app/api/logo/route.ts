import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { mimeTypePorExtensao } from "@/lib/upload";

/**
 * Serve o logo do sistema: o personalizado (upload em Configurações → Logo,
 * salvo em UPLOADS_DIR/logo/) ou o padrão public/logo.svg quando não há upload.
 */
export async function GET() {
  const uploadsDir = process.env.UPLOADS_DIR ?? "./data/uploads";
  const pastaLogo = path.join(uploadsDir, "logo");

  try {
    const arquivos = await readdir(pastaLogo);
    const nomeLogo = arquivos.find((a) => !a.startsWith("."));
    if (nomeLogo) {
      const bytes = await readFile(path.join(pastaLogo, nomeLogo));
      return new NextResponse(new Uint8Array(bytes), {
        headers: {
          "Content-Type": mimeTypePorExtensao(nomeLogo),
          "Cache-Control": "public, max-age=300",
        },
      });
    }
  } catch {
    // Pasta não existe — usa o logo padrão
  }

  const logoPadrao = await readFile(path.join(process.cwd(), "public", "logo.svg"));
  return new NextResponse(new Uint8Array(logoPadrao), {
    headers: {
      "Content-Type": "image/svg+xml",
      "Cache-Control": "public, max-age=300",
    },
  });
}
