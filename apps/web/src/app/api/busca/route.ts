import { NextResponse } from "next/server";
import { ilike, or, eq } from "drizzle-orm";
import { usuarioEquipe } from "@/lib/sessao";
import { db } from "@/db";
import { clientes, embarcacoes, processos, servicos } from "@/db/schema";

export async function GET(req: Request) {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const q = new URL(req.url).searchParams.get("q")?.trim();
  if (!q || q.length < 2) {
    return NextResponse.json({ clientes: [], embarcacoes: [], processos: [] });
  }

  const termo = `%${q}%`;

  const resultadosClientes = await db
    .select({ id: clientes.id, nome: clientes.nome, cpfCnpj: clientes.cpfCnpj })
    .from(clientes)
    .where(or(ilike(clientes.nome, termo), ilike(clientes.cpfCnpj, termo)))
    .limit(5);

  const resultadosEmbarcacoes = await db
    .select({ id: embarcacoes.id, nome: embarcacoes.nome })
    .from(embarcacoes)
    .where(ilike(embarcacoes.nome, termo))
    .limit(5);

  const resultadosProcessos = await db
    .select({
      id: processos.id,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
    })
    .from(processos)
    .innerJoin(clientes, eq(processos.clienteId, clientes.id))
    .innerJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(or(ilike(clientes.nome, termo), ilike(servicos.nome, termo)))
    .limit(5);

  return NextResponse.json({
    clientes: resultadosClientes,
    embarcacoes: resultadosEmbarcacoes,
    processos: resultadosProcessos,
  });
}
