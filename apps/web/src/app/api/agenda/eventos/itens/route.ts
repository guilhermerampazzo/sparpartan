import { NextResponse } from "next/server";
import { usuarioEquipe } from "@/lib/sessao";
import { ENTIDADES_EVENTO, entidadeValida, buscarItensEntidade } from "@/lib/agenda-eventos";

/** GET /api/agenda/eventos/itens?entidade=cliente → { itens: [{ id, rotulo }] } */
export async function GET(req: Request) {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const entidade = searchParams.get("entidade") ?? "";
  if (!entidadeValida(entidade)) {
    return NextResponse.json({ error: "Entidade inválida" }, { status: 400 });
  }
  if (!ENTIDADES_EVENTO.some((e) => e.valor === entidade)) {
    return NextResponse.json({ error: "Entidade não suportada" }, { status: 400 });
  }

  const itens = await buscarItensEntidade(entidade);
  return NextResponse.json({ itens });
}
