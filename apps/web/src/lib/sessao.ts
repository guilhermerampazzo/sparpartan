import { auth } from "@/lib/auth";

type UsuarioSessao = {
  id?: string;
  name?: string | null;
  email?: string | null;
  role?: string;
  tipo?: string;
};

/** Id do usuário da equipe logado, para preencher campos "criado por". Null para sessão de cliente/portal. */
export async function idUsuarioEquipe(): Promise<string | null> {
  const session = await auth();
  const usuario = session?.user as UsuarioSessao | undefined;
  return usuario?.tipo === "equipe" ? (usuario.id ?? null) : null;
}

/**
 * Retorna o usuário logado SOMENTE se for da equipe (admin/operador/leitura).
 * Null para sessão de cliente/portal/aluno — rotas de API de staff devem usar
 * isso para não deixar uma sessão de cliente baixar dados internos.
 */
export async function usuarioEquipe(): Promise<UsuarioSessao | null> {
  const session = await auth();
  const usuario = session?.user as UsuarioSessao | undefined;
  return usuario?.tipo === "equipe" ? usuario : null;
}
