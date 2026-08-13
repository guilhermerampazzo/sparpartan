import { asc } from "drizzle-orm";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { BackButton } from "@/components/ui";
import { Carrinho } from "./carrinho";

export default async function CarrinhoPage() {
  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome, cpfCnpj: clientes.cpfCnpj })
    .from(clientes)
    .orderBy(asc(clientes.nome));

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja/catalogo-cliente" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Carrinho</h1>
      <Carrinho listaClientes={listaClientes} />
    </div>
  );
}
