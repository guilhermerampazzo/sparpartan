"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { db } from "@/db";
import { materias, pedidosPagamento } from "@/db/schema";
import { authAluno } from "@/lib/auth-aluno";
import { verificarMatriculaAtiva } from "@/lib/acesso-aluno";
import { registrarAuditoria } from "@/lib/audit";

export async function iniciarCheckout(materiaId: string) {
  const session = await authAluno();
  const alunoId = session?.user?.id as string | undefined;
  const alunoEmail = session?.user?.email as string | undefined;
  if (!alunoId) redirect("/aluno/login");
  const alunoNome = session?.user?.name ?? "aluno";

  const [materia] = await db.select().from(materias).where(eq(materias.id, materiaId)).limit(1);
  if (!materia || !materia.precoCentavos) redirect(`/aluno/materias/${materiaId}`);

  const jaTemAcesso = await verificarMatriculaAtiva(alunoId, materiaId);
  if (jaTemAcesso) redirect(`/aluno/materias/${materiaId}`);

  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("MERCADOPAGO_ACCESS_TOKEN não configurado — defina no .env antes de usar o checkout.");
  }

  const [pedido] = await db
    .insert(pedidosPagamento)
    .values({
      alunoId,
      materiaId,
      valorCentavos: materia.precoCentavos,
      status: "pendente",
    })
    .returning({ id: pedidosPagamento.id });

  const client = new MercadoPagoConfig({ accessToken });
  const preference = new Preference(client);

  // O Mercado Pago precisa de uma URL pública alcançável para o webhook —
  // um localhost aqui faria a notificação de pagamento nunca chegar.
  const baseUrl = process.env.AUTH_URL;
  if (!baseUrl) {
    throw new Error("AUTH_URL não configurada — defina a URL pública no .env para usar o checkout.");
  }

  const resultado = await preference.create({
    body: {
      items: [
        {
          id: materiaId,
          title: materia.titulo,
          quantity: 1,
          unit_price: materia.precoCentavos / 100,
          currency_id: "BRL",
        },
      ],
      payer: alunoEmail ? { email: alunoEmail } : undefined,
      external_reference: pedido.id,
      back_urls: {
        success: `${baseUrl}/aluno/materias/${materiaId}?pagamento=sucesso`,
        pending: `${baseUrl}/aluno/materias/${materiaId}?pagamento=pendente`,
        failure: `${baseUrl}/aluno/materias/${materiaId}?pagamento=falha`,
      },
      notification_url: `${baseUrl}/api/lms/mercadopago/webhook`,
    },
  });

  await db
    .update(pedidosPagamento)
    .set({ mercadopagoPreferenceId: resultado.id })
    .where(eq(pedidosPagamento.id, pedido.id));

  await registrarAuditoria(
    "criar",
    "pedido_pagamento",
    pedido.id,
    `checkout de "${materia.titulo}" — R$ ${(materia.precoCentavos / 100).toLocaleString("pt-BR")}`,
    alunoNome
  );

  const urlCheckout = resultado.init_point;
  if (!urlCheckout) throw new Error("Mercado Pago não retornou a URL de checkout.");

  redirect(urlCheckout);
}
