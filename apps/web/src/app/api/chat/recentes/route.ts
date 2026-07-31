import { and, count, desc, eq, gt, isNull, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { mensagens, usuarios } from "@/db/schema";

export async function POST() {
  const session = await auth();
  const usuario = session?.user as { id?: string; tipo?: string } | undefined;
  if (!usuario?.id || usuario.tipo !== "equipe") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }
  await db.update(usuarios).set({ chatUltimaLeituraEm: new Date() }).where(eq(usuarios.id, usuario.id));
  return NextResponse.json({ ok: true });
}

export async function GET() {
  const session = await auth();
  const usuario = session?.user as { id?: string; tipo?: string } | undefined;
  if (!usuario?.id || usuario.tipo !== "equipe") {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const [linhaUsuario] = await db
    .select({ chatUltimaLeituraEm: usuarios.chatUltimaLeituraEm })
    .from(usuarios)
    .where(eq(usuarios.id, usuario.id))
    .limit(1);
  const ultimaLeitura = linhaUsuario?.chatUltimaLeituraEm ?? new Date(0);

  const recentes = await db
    .select({
      id: mensagens.id,
      usuarioNome: mensagens.usuarioNome,
      corpo: mensagens.corpo,
      criadoEm: mensagens.criadoEm,
      destinatarioId: mensagens.destinatarioId,
    })
    .from(mensagens)
    .where(and(isNull(mensagens.apagadaEm), or(isNull(mensagens.destinatarioId), eq(mensagens.destinatarioId, usuario.id))))
    .orderBy(desc(mensagens.criadoEm))
    .limit(8);

  const [naoLidas] = await db
    .select({ total: count() })
    .from(mensagens)
    .where(
      and(
        gt(mensagens.criadoEm, ultimaLeitura),
        or(isNull(mensagens.destinatarioId), eq(mensagens.destinatarioId, usuario.id)),
        isNull(mensagens.apagadaEm),
        ne(mensagens.usuarioId, usuario.id)
      )
    );

  return NextResponse.json({
    naoLidas: naoLidas?.total ?? 0,
    mensagens: recentes.reverse(),
  });
}
