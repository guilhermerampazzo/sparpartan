import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { FileText, Paperclip } from "lucide-react";
import { db } from "@/db";
import { lojaVendaDocumentos, lojaVendas, clientes } from "@/db/schema";
import { EmptyState, DataTable, type Column } from "@/components/ui";

type LinhaDocumento = {
  id: string;
  nomeOriginal: string;
  tipo: string;
  clienteNome: string;
  vendaId: string;
  criadoEm: Date;
};

export default async function DocumentosLojaPage() {
  const lista = await db
    .select({
      id: lojaVendaDocumentos.id,
      nomeOriginal: lojaVendaDocumentos.nomeOriginal,
      tipo: lojaVendaDocumentos.tipo,
      clienteNome: clientes.nome,
      vendaId: lojaVendas.id,
      criadoEm: lojaVendaDocumentos.criadoEm,
    })
    .from(lojaVendaDocumentos)
    .innerJoin(lojaVendas, eq(lojaVendaDocumentos.vendaId, lojaVendas.id))
    .innerJoin(clientes, eq(lojaVendas.clienteId, clientes.id))
    .orderBy(desc(lojaVendaDocumentos.criadoEm));

  const columns: Column<LinhaDocumento>[] = [
    {
      header: "Documento",
      cell: (d) => (
        <Link
          href={`/api/loja-venda-documentos/${d.id}`}
          target="_blank"
          className="flex items-center gap-2 font-medium text-primary hover:underline"
        >
          <Paperclip size={14} /> {d.nomeOriginal}
        </Link>
      ),
    },
    { header: "Tipo", cell: (d) => d.tipo },
    {
      header: "Cliente / Venda",
      cell: (d) => (
        <Link href={`/loja/vendas/${d.vendaId}`} className="hover:underline">
          {d.clienteNome}
        </Link>
      ),
    },
    { header: "Enviado em", cell: (d) => new Date(d.criadoEm).toLocaleDateString("pt-BR") },
  ];

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Documentos da Loja</h1>
      <p className="text-body-sm text-outline">
        Contratos, pedidos, garantias, notas fiscais, recibos e termos de entrega das vendas da loja.
      </p>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(d) => d.id}
        empty={
          <EmptyState
            icon={FileText}
            title="Nenhum documento enviado ainda"
            description="Documentos são anexados na ficha de cada venda."
          />
        }
      />
    </div>
  );
}
