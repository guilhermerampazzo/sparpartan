import { eq } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { db } from "@/db";
import { materias } from "@/db/schema";
import { BackButton } from "@/components/ui";

import { authAluno } from "@/lib/auth-aluno";
import { verificarMatriculaAtiva } from "@/lib/acesso-aluno";
import { iniciarCheckout } from "../../actions";

export default async function ComprarMateriaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await authAluno();
  if (!session?.user?.id) redirect("/aluno/login");
  const alunoId = session.user.id as string;

  const [materia] = await db.select().from(materias).where(eq(materias.id, id)).limit(1);
  if (!materia || !materia.ativo || !materia.precoCentavos) notFound();

  const jaTemAcesso = await verificarMatriculaAtiva(alunoId, id);
  if (jaTemAcesso) redirect(`/aluno/materias/${id}`);

  const iniciarComId = iniciarCheckout.bind(null, id);

  return (
    <div className="mx-auto max-w-md space-y-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-8 text-center">
      <div className="text-left">
        <BackButton href={`/aluno/materias/${id}`} />
      </div>
      <h2 className="font-display text-title-lg font-bold text-primary">{materia.titulo}</h2>
      {materia.descricao && <p className="text-body-sm text-outline">{materia.descricao}</p>}
      <p className="text-title-md font-semibold text-primary">
        {(materia.precoCentavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
      </p>
      <form action={iniciarComId}>
        <button
          type="submit"
          className="w-full rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-on-primary hover:opacity-90"
        >
          Pagar com Mercado Pago
        </button>
      </form>
    </div>
  );
}
