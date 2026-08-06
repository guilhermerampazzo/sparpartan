"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agendaEventos, agendaInteressados, clientes } from "@/db/schema";
import { enviarEmail } from "@/lib/mail/adapter";
import { Validador, valoresDoFormData, type EstadoForm } from "@/lib/validacao";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function uuidOuNull(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "");
  return UUID_RE.test(texto) ? texto : null;
}

function dataHoraLocal(valor: string) {
  const data = new Date(valor);
  return Number.isNaN(data.getTime()) ? null : data;
}

export async function criarEvento(
  _estadoAnterior: EstadoForm,
  formData: FormData
): Promise<EstadoForm> {
  const titulo = String(formData.get("titulo") ?? "").trim();
  const dataHora = String(formData.get("dataHora") ?? "");
  const valores = valoresDoFormData(formData);

  const erro = new Validador()
    .exigir(!!titulo, "Informe o título.")
    .exigir(!!dataHora, "Informe a data e hora.").erro;
  if (erro) return { erro, valores };

  const clienteId = uuidOuNull(formData.get("clienteId"));
  const processoId = uuidOuNull(formData.get("processoId"));
  const tipo = String(formData.get("tipo") ?? "compromisso") as "compromisso" | "prova" | "vencimento";
  const data = dataHoraLocal(dataHora);
  if (!data) return { erro: "Data e hora inválidas.", valores };

  const [evento] = await db
    .insert(agendaEventos)
    .values({
      clienteId,
      processoId,
      titulo,
      dataHora: data,
      tipo,
      local: String(formData.get("local") ?? "") || null,
      representanteLegal: String(formData.get("representanteLegal") ?? "") || null,
      observacoes: String(formData.get("observacoes") ?? "") || null,
    })
    .returning({ id: agendaEventos.id });

  for (let i = 1; i <= 5; i++) {
    const nomeInteressado = String(formData.get(`interessado${i}Nome`) ?? "").trim();
    if (!nomeInteressado) continue;
    await db.insert(agendaInteressados).values({
      eventoId: evento.id,
      nomeInteressado,
      cpfInteressado: String(formData.get(`interessado${i}Cpf`) ?? "") || null,
      servicoSolicitado: String(formData.get(`interessado${i}Servico`) ?? "") || null,
    });
  }

  if (tipo === "prova" && clienteId) {
    const [cliente] = await db.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1);
    if (cliente?.email) {
      const dataFormatada = data.toLocaleString("pt-BR", { dateStyle: "long", timeStyle: "short" });
      try {
        await enviarEmail({
          to: cliente.email,
          subject: `Sua prova foi agendada — ${titulo}`,
          html: `<p>Olá ${cliente.nome},</p><p>Sua inscrição em <strong>${titulo}</strong> foi confirmada. A prova está marcada para <strong>${dataFormatada}</strong>.</p><p>Sparapan Solução Naval</p>`,
        });
      } catch {
        // Falha de e-mail não impede o evento de ter sido criado.
      }
    }
  }

  redirect("/agenda");
}

export async function confirmarEvento(eventoId: string) {
  await db.update(agendaEventos).set({ status: "confirmado" }).where(eq(agendaEventos.id, eventoId));
  redirect("/agenda");
}

export async function concluirEvento(eventoId: string) {
  await db.update(agendaEventos).set({ status: "concluido" }).where(eq(agendaEventos.id, eventoId));
  redirect("/agenda");
}
