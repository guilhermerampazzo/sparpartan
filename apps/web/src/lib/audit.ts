import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { auth } from "@/lib/auth";

export async function registrarAuditoria(
  acao: "criar" | "atualizar" | "excluir" | "arquivar" | "alterar_status" | "login" | "enviar",
  entidade: string,
  entidadeId: string,
  detalhes?: string,
  /** Nome do usuário quando a ação vem de fora da sessão da equipe (portal do
   *  aluno, portal do cliente, links públicos) — senão usa a sessão atual. */
  usuarioNomeOverride?: string
) {
  const session = await auth();
  const usuario = session?.user;
  const tipoSessao = (usuario as { tipo?: string })?.tipo;

  await db.insert(auditLog).values({
    usuarioId: tipoSessao === "equipe" ? (usuario?.id as string) : null,
    usuarioNome: usuarioNomeOverride ?? usuario?.name ?? "desconhecido",
    acao,
    entidade,
    entidadeId,
    detalhes,
  });
}
