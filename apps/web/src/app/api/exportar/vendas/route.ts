import { NextResponse } from "next/server";
import { eq, desc } from "drizzle-orm";
import { usuarioEquipe } from "@/lib/sessao";
import { db } from "@/db";
import { servicosContratados, clientes, servicos } from "@/db/schema";

function csvEscape(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export async function GET() {
  if (!(await usuarioEquipe())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 403 });
  }

  const vendas = await db
    .select({
      dataContratacao: servicosContratados.dataContratacao,
      clienteNome: clientes.nome,
      servicoNome: servicos.nome,
      valor: servicosContratados.valor,
    })
    .from(servicosContratados)
    .innerJoin(clientes, eq(servicosContratados.clienteId, clientes.id))
    .innerJoin(servicos, eq(servicosContratados.servicoId, servicos.id))
    .orderBy(desc(servicosContratados.dataContratacao));

  const linhas = [
    "Data,Cliente,Servico,Valor",
    ...vendas.map((v) =>
      [v.dataContratacao, v.clienteNome, v.servicoNome, v.valor].map(csvEscape).join(",")
    ),
  ];

  return new NextResponse(linhas.join("\n"), {
    headers: {
      "Content-Disposition": 'attachment; filename="vendas.csv"',
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
