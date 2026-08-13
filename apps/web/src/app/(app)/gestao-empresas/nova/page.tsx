import { desc } from "drizzle-orm";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { EmpresaForm } from "./form";

export default async function NovaEmpresaPage() {
  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome, cpfCnpj: clientes.cpfCnpj })
    .from(clientes)
    .orderBy(clientes.nome);

  return (
    <>
      <BackButton href="/gestao-empresas" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Nova Empresa</h1>
      <EmpresaForm listaClientes={listaClientes} />
    </>
  );
}
