import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { Truck } from "lucide-react";
import { db } from "@/db";
import { lojaEntregas, lojaVendas, clientes, lojaVendaItens } from "@/db/schema";
import { Badge, EmptyState, DataTable, type Column, BackButton } from "@/components/ui";
import { dataIsoParaBR } from "@/lib/datas";
import { formatarMoeda, infoStatusEntrega } from "@/lib/loja";

type LinhaEntrega = {
  id: string;
  vendaId: string;
  clienteNome: string;
  cidade: string | null;
  endereco: string | null;
  transportadora: string | null;
  dataPrevista: string | null;
  dataRealizada: string | null;
  frete: string;
  pedagio: string;
  outrosCustos: string;
  status: string;
};

export default async function EntregasLojaPage() {
  const lista = await db
    .select({
      id: lojaEntregas.id,
      vendaId: lojaVendas.id,
      clienteNome: clientes.nome,
      cidade: lojaEntregas.cidade,
      endereco: lojaEntregas.endereco,
      transportadora: lojaEntregas.transportadora,
      dataPrevista: lojaEntregas.dataPrevista,
      dataRealizada: lojaEntregas.dataRealizada,
      frete: lojaEntregas.frete,
      pedagio: lojaEntregas.pedagio,
      outrosCustos: lojaEntregas.outrosCustos,
      status: lojaEntregas.status,
    })
    .from(lojaEntregas)
    .innerJoin(lojaVendas, eq(lojaEntregas.vendaId, lojaVendas.id))
    .innerJoin(clientes, eq(lojaVendas.clienteId, clientes.id))
    .orderBy(desc(lojaEntregas.criadoEm));

  const itens = await db.select().from(lojaVendaItens);
  const produtosPorVenda = new Map<string, string[]>();
  for (const item of itens) {
    const produtos = produtosPorVenda.get(item.vendaId) ?? [];
    produtos.push(item.descricao);
    produtosPorVenda.set(item.vendaId, produtos);
  }

  const columns: Column<LinhaEntrega>[] = [
    { header: "Cliente", cell: (e) => <Link href={`/loja/entregas/${e.id}`} className="font-medium text-primary hover:underline">{e.clienteNome}</Link> },
    { header: "Produto(s)", cell: (e) => produtosPorVenda.get(e.vendaId)?.join(", ") || "—" },
    { header: "Cidade", cell: (e) => e.cidade ?? "—" },
    { header: "Endereço", cell: (e) => e.endereco ?? "—" },
    { header: "Transportadora", cell: (e) => e.transportadora ?? "—" },
    { header: "Data Prevista", cell: (e) => dataIsoParaBR(e.dataPrevista) },
    { header: "Data Realizada", cell: (e) => dataIsoParaBR(e.dataRealizada) },
    { header: "Total custos", cell: (e) => formatarMoeda(Number(e.frete) + Number(e.pedagio) + Number(e.outrosCustos)) },
    { header: "Status", cell: (e) => { const status = infoStatusEntrega(e.status); return <Badge tone={status.tone} size="sm">{status.label}</Badge>; } },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Entregas</h1>
      <p className="text-body-sm text-outline">Acompanhe as entregas e seus custos.</p>
      <DataTable columns={columns} rows={lista} rowKey={(e) => e.id} empty={<EmptyState icon={Truck} title="Nenhuma entrega registrada ainda" description="Entregas são criadas na aba Resumo de cada venda." />} />
    </div>
  );
}
