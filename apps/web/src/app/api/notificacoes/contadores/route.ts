import { and, count, eq, gt, isNull, lte, ne, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { agendaEventos, lembretes, mensagens, orcamentos, taxasPagar, usuarios } from "@/db/schema";

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

  const emSeteDias = new Date();
  emSeteDias.setDate(emSeteDias.getDate() + 7);
  const emSeteDiasStr = emSeteDias.toISOString().slice(0, 10);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const [[chat], [lembretesCount], [taxasCount], [agendaCount], [orcamentosCount]] = await Promise.all([
    db
      .select({ total: count() })
      .from(mensagens)
      .where(
        and(
          gt(mensagens.criadoEm, ultimaLeitura),
          or(isNull(mensagens.destinatarioId), eq(mensagens.destinatarioId, usuario.id)),
          isNull(mensagens.apagadaEm),
          ne(mensagens.usuarioId, usuario.id)
        )
      ),
    db
      .select({ total: count() })
      .from(lembretes)
      .where(eq(lembretes.resolvido, false)),
    db
      .select({ total: count() })
      .from(taxasPagar)
      .where(and(eq(taxasPagar.status, "pendente"), lte(taxasPagar.vencimento, emSeteDiasStr))),
    db
      .select({ total: count() })
      .from(agendaEventos)
      .where(and(eq(agendaEventos.status, "pendente"), gt(agendaEventos.dataHora, hoje))),
    db
      .select({ total: count() })
      .from(orcamentos)
      .where(and(eq(orcamentos.status, "pendente"), isNull(orcamentos.excluidoEm))),
  ]);

  return NextResponse.json({
    chat: chat?.total ?? 0,
    lembretes: lembretesCount?.total ?? 0,
    taxas: taxasCount?.total ?? 0,
    agenda: agendaCount?.total ?? 0,
    orcamentos: orcamentosCount?.total ?? 0,
  });
}
