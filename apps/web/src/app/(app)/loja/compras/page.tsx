import { desc, eq } from "drizzle-orm";
import { ClipboardList, Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { lojaCompras, lojaFornecedores } from "@/db/schema";
import { Badge, EmptyState, LinkButton, BackButton } from "@/components/ui";
import { infoStatusCompra } from "@/lib/loja";
import { formatarDataBR } from "@/lib/datas";

export default async function ComprasPage() {
  const lista = await db
    .select({
      id: lojaCompras.id,
      numero: lojaCompras.numero,
      status: lojaCompras.status,
      criadoEm: lojaCompras.criadoEm,
      fornecedorNome: lojaFornecedores.razaoSocial,
    })
    .from(lojaCompras)
    .innerJoin(lojaFornecedores, eq(lojaCompras.fornecedorId, lojaFornecedores.id))
    .orderBy(desc(lojaCompras.criadoEm));

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">Compras</h1>
          <p className="text-body-sm text-outline">
            Pedidos de compra por fornecedor — informe o que precisa e o sistema organiza os pedidos.
          </p>
        </div>
        <LinkButton href="/loja/compras/novo" icon={Plus}>+ Novo Pedido</LinkButton>
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={ClipboardList} title="Nenhum pedido de compra ainda" />
      ) : (
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <ul className="divide-y divide-outline-variant">
            {lista.map((c) => {
              const info = infoStatusCompra(c.status);
              return (
                <li key={c.id}>
                  <Link href={`/loja/compras/${c.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-container-low">
                    <div>
                      <p className="text-body-md font-medium text-primary">{c.numero}</p>
                      <p className="text-body-sm text-outline">{c.fornecedorNome} · criado em {formatarDataBR(c.criadoEm)}</p>
                    </div>
                    <Badge tone={info.tone} size="sm">{info.label}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
