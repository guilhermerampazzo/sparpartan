import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { empresas, clientes } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { EmpresaForm } from "../../nova/form";

export default async function EditarEmpresaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [empresa] = await db.select().from(empresas).where(eq(empresas.id, id)).limit(1);
  if (!empresa) notFound();

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome, cpfCnpj: clientes.cpfCnpj })
    .from(clientes)
    .orderBy(clientes.nome);

  return (
    <>
      <BackButton href={`/gestao-empresas/${id}`} />
      <h1 className="font-display text-headline-lg font-bold text-primary">Editar Empresa</h1>
      <EmpresaForm
        listaClientes={listaClientes}
        empresaId={id}
        valoresIniciais={{
          razaoSocial: empresa.razaoSocial,
          nomeFantasia: empresa.nomeFantasia ?? "",
          cnpj: empresa.cnpj ?? "",
          inscricaoEstadual: empresa.inscricaoEstadual ?? "",
          endereco: empresa.endereco ?? "",
          telefone: empresa.telefone ?? "",
          email: empresa.email ?? "",
          responsavel: empresa.responsavel ?? "",
          observacoes: empresa.observacoes ?? "",
          status: empresa.status,
        }}
      />
    </>
  );
}
