import { Queue, Worker } from "bullmq";
import { verificarVencimentos } from "./jobs/vencimentos.js";
import { confirmarCompromissos, confirmarProvas } from "./jobs/compromissos.js";
import { varrerStatus } from "./jobs/status.js";
import { varrerEmpresas } from "./jobs/empresas.js";
import { digestDiario } from "./jobs/digest.js";
import { enviarAniversarios } from "./jobs/aniversarios.js";

const connection = { url: process.env.REDIS_URL ?? "redis://redis:6379" };

export const lembretesQueue = new Queue("lembretes", { connection });

const worker = new Worker(
  "lembretes",
  async (job) => {
    if (job.name === "verificar-vencimentos") {
      const criados = await verificarVencimentos();
      console.log(`[worker] verificar-vencimentos: ${criados} lembrete(s) criado(s)`);
      return { criados };
    }
    if (job.name === "confirmar-compromissos") {
      const criados = await confirmarCompromissos();
      console.log(`[worker] confirmar-compromissos: ${criados} lembrete(s) criado(s)`);
      return { criados };
    }
    if (job.name === "confirmar-provas") {
      const criados = await confirmarProvas();
      console.log(`[worker] confirmar-provas: ${criados} aviso(s) criado(s)`);
      return { criados };
    }
    if (job.name === "varrer-status") {
      const resultado = await varrerStatus();
      console.log("[worker] varrer-status:", resultado);
      return resultado;
    }
    if (job.name === "digest-diario") {
      const resultado = await digestDiario();
      console.log("[worker] digest-diario:", resultado);
      return resultado;
    }
    if (job.name === "enviar-aniversarios") {
      const resultado = await enviarAniversarios();
      console.log("[worker] enviar-aniversarios:", resultado);
      return resultado;
    }
    if (job.name === "varrer-empresas") {
      const resultado = await varrerEmpresas();
      console.log("[worker] varrer-empresas:", resultado);
      return resultado;
    }
    console.warn(`[worker] job desconhecido: ${job.name}`);
  },
  { connection }
);

worker.on("ready", () => console.log("[worker] conectado ao Redis"));
worker.on("error", (err: Error) => console.error("[worker] erro de conexão Redis", err));
worker.on("failed", (job, err) => console.error(`[worker] job ${job?.id} falhou:`, err));

async function registrarJobsAgendados() {
  // Horários em America/Sao_Paulo (BRT). O container roda em UTC por padrão —
  // sem o `tz`, as "07:00" dos comentários virariam 07:00 UTC (04:00 BRT).
  const fuso = "America/Sao_Paulo";

  // Roda todo dia às 07:00 — varre vencimentos em 30/15/7 dias e cria lembretes.
  await lembretesQueue.upsertJobScheduler(
    "verificar-vencimentos-diario",
    { pattern: "0 7 * * *", tz: fuso },
    { name: "verificar-vencimentos" }
  );

  // Roda todo dia às 08:00 — confirma compromissos comuns do dia seguinte.
  await lembretesQueue.upsertJobScheduler(
    "confirmar-compromissos-diario",
    { pattern: "0 8 * * *", tz: fuso },
    { name: "confirmar-compromissos" }
  );

  // Roda todo dia às 08:30 — avisa o cliente por e-mail 3 e 1 dia antes da prova.
  await lembretesQueue.upsertJobScheduler(
    "confirmar-provas-diario",
    { pattern: "30 8 * * *", tz: fuso },
    { name: "confirmar-provas" }
  );

  // Roda todo dia às 06:00, antes dos demais — expira orçamentos/solicitações,
  // marca documentos vencidos e pagamentos atrasados.
  await lembretesQueue.upsertJobScheduler(
    "varrer-status-diario",
    { pattern: "0 6 * * *", tz: fuso },
    { name: "varrer-status" }
  );

  // Roda todo dia às 09:00 — envia ao admin o resumo das pendências do dia.
  await lembretesQueue.upsertJobScheduler(
    "digest-diario",
    { pattern: "0 9 * * *", tz: fuso },
    { name: "digest-diario" }
  );

  // Roda todo dia às 10:00 — parabeniza aniversariantes do dia.
  await lembretesQueue.upsertJobScheduler(
    "enviar-aniversarios-diario",
    { pattern: "0 10 * * *", tz: fuso },
    { name: "enviar-aniversarios" }
  );

  // Roda todo dia às 10:30 — recria alertas de vencimento das empresas contratantes
  // (35 dias → próximo, 15 dias → urgente, vencido) e manutenções próximas.
  await lembretesQueue.upsertJobScheduler(
    "varrer-empresas-diario",
    { pattern: "30 10 * * *", tz: fuso },
    { name: "varrer-empresas" }
  );

  console.log(
    "[worker] jobs agendados (status 06:00, vencimentos 07:00, compromissos 08:00, provas 08:30, digest 09:00, aniversários 10:00 — America/Sao_Paulo)"
  );
}

/**
 * O upsert de schedulers depende do Redis; se ele estiver inacessível no boot,
 * sem retry o worker subiria sem NENHUM job cron até ser reiniciado. Com o retry
 * (backoff crescente), o registro se recupera assim que o Redis responde.
 */
async function registrarJobsAgendadosComRetry() {
  for (let tentativa = 1; tentativa <= 10; tentativa++) {
    try {
      await registrarJobsAgendados();
      return;
    } catch (err) {
      console.error(`[worker] falha ao agendar jobs (tentativa ${tentativa}/10)`, err);
      await new Promise((resolve) => setTimeout(resolve, 5000 * tentativa));
    }
  }
  console.error("[worker] desistiu de registrar jobs agendados após 10 tentativas");
}

registrarJobsAgendadosComRetry();

console.log("[worker] Sparapan worker iniciado");
