import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lojaFornecedores } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { FornecedorForm } from "../../nova/form";

export default async function EditarFornecedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [fornecedor] = await db.select().from(lojaFornecedores).where(eq(lojaFornecedores.id, id)).limit(1);
  if (!fornecedor) notFound();

  return (
    <>
      <BackButton href={`/loja/fornecedores/${id}`} />
      <h1 className="font-display text-headline-lg font-bold text-primary">Editar Fornecedor</h1>
      <FornecedorForm
        fornecedorId={id}
        valoresIniciais={{
          razaoSocial: fornecedor.razaoSocial,
          nomeFantasia: fornecedor.nomeFantasia ?? "",
          cnpj: fornecedor.cnpj ?? "",
          telefone: fornecedor.telefone ?? "",
          whatsapp: fornecedor.whatsapp ?? "",
          email: fornecedor.email ?? "",
          endereco: fornecedor.endereco ?? "",
          cidade: fornecedor.cidade ?? "",
          contatoResponsavel: fornecedor.contatoResponsavel ?? "",
          condicoesPagamento: fornecedor.condicoesPagamento ?? "",
          prazoMedioEntrega: fornecedor.prazoMedioEntrega ?? "",
          observacoes: fornecedor.observacoes ?? "",
        }}
      />
    </>
  );
}
