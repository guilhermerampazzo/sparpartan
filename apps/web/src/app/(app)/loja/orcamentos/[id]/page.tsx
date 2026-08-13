import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { lojaOrcamentos, lojaOrcamentoItens, clientes, lojaVendas, usuarios } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { Badge, Button, BackButton, LinkButton } from "@/components/ui";
import { infoStatusOrcamento, formatarMoeda } from "@/lib/loja";
import { formatarDataBR } from "@/lib/datas";
import { aprovarOrcamentoLoja, recusarOrcamentoLoja, avancarOrcamentoLoja } from "../actions";

export default async function OrcamentoLojaDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [orcamento] = await db.select().from(lojaOrcamentos).where(eq(lojaOrcamentos.id, id)).limit(1);
  if (!orcamento) notFound();

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, orcamento.clienteId)).limit(1);
  const [vendedor] = orcamento.vendedorId
    ? await db.select().from(usuarios).where(eq(usuarios.id, orcamento.vendedorId)).limit(1)
    : [];
  const itens = await db.select().from(lojaOrcamentoItens).where(eq(lojaOrcamentoItens.orcamentoId, id));
  const [vendaGerada] = await db.select().from(lojaVendas).where(eq(lojaVendas.orcamentoId, id)).limit(1);

  const info = infoStatusOrcamento(orcamento.status);
  const aprovarComId = aprovarOrcamentoLoja.bind(null, id);
  const recusarComId = recusarOrcamentoLoja.bind(null, id);
  const avancarComId = avancarOrcamentoLoja.bind(null, id);

  const linkWhatsApp = cliente?.telefone || cliente?.celular
    ? `https://wa.me/55${(cliente.celular ?? cliente.telefone ?? "").replace(/\D/g, "")}?text=${encodeURIComponent(
        `Olá ${cliente.nome}! Segue o orçamento ${orcamento.numero} da Sparapan no valor de ${formatarMoeda(orcamento.valorTotal)}.`
      )}`
    : null;

  const desconto = Number(orcamento.desconto ?? 0);
  const frete = Number(orcamento.frete ?? 0);

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja/orcamentos" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-headline-lg font-bold text-primary">{orcamento.numero}</h1>
            <Badge tone={info.tone} size="sm">{info.label}</Badge>
          </div>
          <p className="text-body-sm text-outline">
            Cliente:{" "}
            <Link href={`/clientes/${cliente.id}`} className="hover:underline">
              {cliente.nome}
            </Link>
          </p>
          <p className="text-body-sm text-outline">
            {[
              vendedor && `Vendedor: ${vendedor.nome}`,
              orcamento.validade && `Validade: ${formatarDataBR(orcamento.validade)}`,
              orcamento.formaPagamento && `Pagamento: ${orcamento.formaPagamento}`,
            ].filter(Boolean).join(" · ")}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <LinkButton href={`/api/loja/orcamentos/${id}/pdf`} variant="outlined" size="sm">
            PDF
          </LinkButton>
          {linkWhatsApp && (
            <a href={linkWhatsApp} target="_blank" rel="noreferrer" className="text-body-sm font-medium text-primary hover:underline">
              WhatsApp
            </a>
          )}
          {cliente?.email && (
            <a href={`mailto:${cliente.email}?subject=${encodeURIComponent(`Orçamento ${orcamento.numero} — Sparapan`)}&body=${encodeURIComponent(`Olá ${cliente.nome}! Segue o orçamento ${orcamento.numero} no valor de ${formatarMoeda(orcamento.valorTotal)}.`)}`} className="text-body-sm font-medium text-primary hover:underline">
              E-mail
            </a>
          )}
          {orcamento.status === "rascunho" && (
            <form action={avancarComId}>
              <input type="hidden" name="proximo" value="enviado" />
              <Button type="submit" variant="outlined" size="sm">Marcar como Enviado</Button>
            </form>
          )}
          {orcamento.status === "enviado" && (
            <form action={avancarComId}>
              <input type="hidden" name="proximo" value="aguardando_aprovacao" />
              <Button type="submit" variant="outlined" size="sm">Aguardando Aprovação</Button>
            </form>
          )}
          {orcamento.status !== "convertido" && orcamento.status !== "recusado" && orcamento.status !== "expirado" && (
            <>
              <form action={recusarComId}>
                <Button type="submit" variant="outlined" size="sm">Recusar</Button>
              </form>
              <form action={aprovarComId}>
                <Button type="submit" variant="filled" size="sm">Aprovar e Converter em Venda</Button>
              </form>
            </>
          )}
          {vendaGerada && (
            <Link href={`/loja/vendas/${vendaGerada.id}`} className="text-body-sm font-medium text-primary hover:underline">
              Ver venda gerada →
            </Link>
          )}
        </div>
      </div>

      <SectionCard title="Itens">
        <table className="w-full text-left text-body-md">
          <thead>
            <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
              <th className="px-2 py-2">Descrição</th>
              <th className="px-2 py-2">Qtd</th>
              <th className="px-2 py-2">Preço Unit.</th>
              <th className="px-2 py-2">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {itens.map((item) => (
              <tr key={item.id} className="border-b border-outline-variant last:border-0">
                <td className="px-2 py-2">{item.descricao}</td>
                <td className="px-2 py-2">{item.quantidade}</td>
                <td className="px-2 py-2">{formatarMoeda(item.precoUnitario)}</td>
                <td className="px-2 py-2">{formatarMoeda(Number(item.precoUnitario) * item.quantidade)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-4 flex flex-col items-end gap-1">
          {desconto > 0 && <p className="text-body-sm text-outline">Desconto: −{formatarMoeda(String(desconto))}</p>}
          {frete > 0 && <p className="text-body-sm text-outline">Frete: {formatarMoeda(String(frete))}</p>}
          <p className="font-display text-title-md font-semibold text-primary">
            Total: {formatarMoeda(orcamento.valorTotal)}
          </p>
        </div>
      </SectionCard>

      {orcamento.observacoes && (
        <SectionCard title="Observações">
          <p className="whitespace-pre-wrap text-body-md text-primary">{orcamento.observacoes}</p>
        </SectionCard>
      )}
    </div>
  );
}
