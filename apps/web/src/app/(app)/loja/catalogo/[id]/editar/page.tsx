import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lojaProdutos } from "@/db/schema";
import { ProdutoLojaForm } from "../../produto-form";

export default async function EditarProdutoLojaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [produto] = await db.select().from(lojaProdutos).where(eq(lojaProdutos.id, id)).limit(1);
  if (!produto) notFound();

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Editar Produto</h1>
      <ProdutoLojaForm produto={produto} />
    </div>
  );
}
