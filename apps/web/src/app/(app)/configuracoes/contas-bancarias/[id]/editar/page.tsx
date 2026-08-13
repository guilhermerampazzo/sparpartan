import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contasBancarias } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { EditarContaBancariaForm } from "../../form";
import { atualizarContaBancaria } from "../../actions";

export default async function EditarContaBancariaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ origem?: string }>;
}) {
  const { id } = await params;
  const { origem } = await searchParams;
  const [conta] = await db
    .select()
    .from(contasBancarias)
    .where(eq(contasBancarias.id, id))
    .limit(1);
  if (!conta) notFound();

  return (
    <div className="space-y-gutter">
      <BackButton href={origem || "/configuracoes/contas-bancarias"} />
      <h1 className="font-display text-headline-lg font-bold text-primary">
        Editar Conta Bancária
      </h1>
      <EditarContaBancariaForm conta={conta} action={atualizarContaBancaria.bind(null, id)} />
    </div>
  );
}
