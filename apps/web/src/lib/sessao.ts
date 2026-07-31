import { auth } from "@/lib/auth";

/** Id do usuário da equipe logado, para preencher campos "criado por". Null para sessão de cliente/portal. */
export async function idUsuarioEquipe(): Promise<string | null> {
  const session = await auth();
  const usuario = session?.user as { id?: string; tipo?: string } | undefined;
  return usuario?.tipo === "equipe" ? (usuario.id ?? null) : null;
}
