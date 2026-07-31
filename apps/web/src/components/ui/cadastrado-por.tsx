import { eq } from "drizzle-orm";
import { db } from "@/db";
import { usuarios } from "@/db/schema";

export async function CadastradoPor({ usuarioId }: { usuarioId: string | null }) {
  if (!usuarioId) return null;

  const [usuario] = await db
    .select({ nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.id, usuarioId))
    .limit(1);

  if (!usuario) return null;

  return <p className="text-body-sm text-outline">Cadastrado por: {usuario.nome}</p>;
}
