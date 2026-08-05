import { db } from "@/db";
import { pendencias } from "@/db/schema";
import type { PendenciaCategoria, PendenciaPrioridade } from "./pendencias";

export type NovaPendenciaInput = {
  descricao: string;
  categoria?: PendenciaCategoria;
  prioridade?: PendenciaPrioridade;
  data: string;
  horario?: string | null;
  clienteId?: string | null;
  embarcacaoId?: string | null;
  processoId?: string | null;
  responsavel?: string | null;
  responsavelId?: string | null;
  observacoes?: string | null;
  origem?: string;
  privada?: boolean;
  criadoPorId?: string | null;
};

/** Cria uma pendência e devolve o id. Usado pelo form manual e pelas integrações automáticas. */
export async function criarPendencia(input: NovaPendenciaInput): Promise<string> {
  const [pendencia] = await db
    .insert(pendencias)
    .values({
      descricao: input.descricao,
      categoria: input.categoria ?? "processos",
      prioridade: input.prioridade ?? "media",
      data: input.data,
      horario: input.horario ?? null,
      clienteId: input.clienteId ?? null,
      embarcacaoId: input.embarcacaoId ?? null,
      processoId: input.processoId ?? null,
      responsavel: input.responsavel ?? null,
      responsavelId: input.responsavelId ?? null,
      observacoes: input.observacoes ?? null,
      origem: input.origem ?? "manual",
      privada: input.privada ?? false,
      criadoPorId: input.criadoPorId ?? null,
    })
    .returning({ id: pendencias.id });
  return pendencia.id;
}

/** Cria várias pendências de uma vez (lote automático). */
export async function criarPendencias(lista: NovaPendenciaInput[]): Promise<string[]> {
  const ids: string[] = [];
  for (const item of lista) ids.push(await criarPendencia(item));
  return ids;
}
