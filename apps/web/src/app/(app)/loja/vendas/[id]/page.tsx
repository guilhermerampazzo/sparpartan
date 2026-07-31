import { notFound } from "next/navigation";
import Link from "next/link";
import { eq, asc } from "drizzle-orm";
import { Paperclip } from "lucide-react";
import { db } from "@/db";
import {
  lojaVendas,
  lojaVendaItens,
  lojaVendaPagamentos,
  lojaVendaChecklistItens,
  lojaVendaDocumentos,
  lojaEntregas,
  clientes,
  lojaOrcamentos,
} from "@/db/schema";
import { SectionCard, CampoSelect, Campo } from "@/components/ui/form-field";
import { Badge, Button, BackButton, CampoMoeda } from "@/components/ui";
import { infoStatusVenda, formatarMoeda, LOJA_VENDA_STATUS } from "@/lib/loja";
import {
  atualizarStatusVenda,
  atualizarFinanceiroVenda,
  adicionarPagamentoVenda,
  adicionarChecklistVenda,
  enviarDocumentoVenda,
  criarOuAtualizarEntregaVenda,
} from "../actions";
import { VendaTabs } from "./tabs";
import { ChecklistToggle } from "./checklist-toggle";

const TIPOS_DOCUMENTO = ["Contrato", "Pedido", "Garantia", "Nota Fiscal", "Recibo", "Termo de Entrega", "Outro"];

export default async function VendaLojaDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [venda] = await db.select().from(lojaVendas).where(eq(lojaVendas.id, id)).limit(1);
  if (!venda) notFound();

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, venda.clienteId)).limit(1);
  const itens = await db.select().from(lojaVendaItens).where(eq(lojaVendaItens.vendaId, id));
  const pagamentos = await db
    .select()
    .from(lojaVendaPagamentos)
    .where(eq(lojaVendaPagamentos.vendaId, id))
    .orderBy(asc(lojaVendaPagamentos.criadoEm));
  const checklist = await db
    .select()
    .from(lojaVendaChecklistItens)
    .where(eq(lojaVendaChecklistItens.vendaId, id))
    .orderBy(asc(lojaVendaChecklistItens.criadoEm));
  const documentos = await db
    .select()
    .from(lojaVendaDocumentos)
    .where(eq(lojaVendaDocumentos.vendaId, id))
    .orderBy(asc(lojaVendaDocumentos.criadoEm));
  const [entrega] = await db.select().from(lojaEntregas).where(eq(lojaEntregas.vendaId, id)).limit(1);
  const [orcamentoOrigem] = venda.orcamentoId
    ? await db.select().from(lojaOrcamentos).where(eq(lojaOrcamentos.id, venda.orcamentoId)).limit(1)
    : [];

  const info = infoStatusVenda(venda.status);
  const totalPago = pagamentos.reduce((acc, p) => acc + Number(p.valor), 0);
  const saldo = Number(venda.valorTotal) - totalPago;
  const lucro =
    venda.custoTotal != null ? Number(venda.valorTotal) - Number(venda.custoTotal) - Number(venda.comissao ?? 0) : null;

  const atualizarStatusComId = atualizarStatusVenda.bind(null, id);
  const atualizarFinanceiroComId = atualizarFinanceiroVenda.bind(null, id);
  const adicionarPagamentoComId = adicionarPagamentoVenda.bind(null, id);
  const adicionarChecklistComId = adicionarChecklistVenda.bind(null, id);
  const enviarDocumentoComId = enviarDocumentoVenda.bind(null, id);
  const salvarEntregaComId = criarOuAtualizarEntregaVenda.bind(null, id);

  const resumo = (
    <div className="space-y-gutter">
      <SectionCard title="Itens da Venda">
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
        <p className="mt-4 text-right font-display text-title-md font-semibold text-primary">
          Total: {formatarMoeda(venda.valorTotal)}
        </p>
      </SectionCard>

      <SectionCard title="Situação">
        <form action={atualizarStatusComId} className="flex flex-wrap items-end gap-3">
          <CampoSelect
            label="Status da Venda"
            name="status"
            defaultValue={venda.status}
            options={LOJA_VENDA_STATUS.map((s) => ({ value: s.value, label: s.label }))}
          />
          <Button type="submit" variant="outlined" size="sm">
            Atualizar Status
          </Button>
        </form>
      </SectionCard>

      <SectionCard title="Entrega">
        <form action={salvarEntregaComId} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Campo label="Cidade" name="cidade" defaultValue={entrega?.cidade ?? ""} />
          <Campo label="Responsável" name="responsavel" defaultValue={entrega?.responsavel ?? ""} />
          <Campo label="Data Prevista" name="dataPrevista" type="date" defaultValue={entrega?.dataPrevista ?? ""} />
          <CampoSelect
            label="Status"
            name="status"
            defaultValue={entrega?.status ?? "pendente"}
            options={[
              { value: "pendente", label: "Pendente" },
              { value: "em_transito", label: "Em Trânsito" },
              { value: "entregue", label: "Entregue" },
            ]}
          />
          <div className="sm:col-span-4">
            <Button type="submit" variant="outlined" size="sm">
              Salvar Entrega
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );

  const financeiro = (
    <div className="space-y-gutter">
      <SectionCard title="Custo e Comissão">
        <form action={atualizarFinanceiroComId} className="flex flex-wrap items-end gap-3">
          <CampoMoeda label="Custo Total" name="custoTotal" defaultValue={venda.custoTotal ?? ""} />
          <CampoMoeda label="Comissão" name="comissao" defaultValue={venda.comissao ?? ""} />
          <Button type="submit" variant="outlined" size="sm">
            Salvar
          </Button>
        </form>
        {lucro !== null && (
          <p className="mt-4 text-body-md text-primary">
            Lucro estimado: <span className="font-semibold">{formatarMoeda(lucro)}</span>
          </p>
        )}
      </SectionCard>

      <SectionCard title={`Pagamentos (${pagamentos.length})`}>
        <dl className="mb-4 grid grid-cols-3 gap-4 text-body-md">
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Total</dt>
            <dd className="text-primary">{formatarMoeda(venda.valorTotal)}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Pago</dt>
            <dd className="text-primary">{formatarMoeda(totalPago)}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Saldo</dt>
            <dd className={saldo > 0 ? "text-danger" : "text-primary"}>{formatarMoeda(saldo)}</dd>
          </div>
        </dl>
        {pagamentos.length > 0 && (
          <table className="mb-4 w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                <th className="px-2 py-2">Valor</th>
                <th className="px-2 py-2">Forma</th>
                <th className="px-2 py-2">Data</th>
              </tr>
            </thead>
            <tbody>
              {pagamentos.map((p) => (
                <tr key={p.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-2 py-2">{formatarMoeda(p.valor)}</td>
                  <td className="px-2 py-2">{p.formaPagamento ?? "—"}</td>
                  <td className="px-2 py-2">{p.dataPagamento ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form action={adicionarPagamentoComId} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <CampoMoeda label="Valor" name="valor" />
          <Campo label="Forma de Pagamento" name="formaPagamento" />
          <Campo label="Data" name="dataPagamento" type="date" />
          <div className="flex items-end">
            <Button type="submit" size="sm">
              Adicionar Pagamento
            </Button>
          </div>
        </form>
      </SectionCard>
    </div>
  );

  const documentosNode = (
    <SectionCard title={`Documentos (${documentos.length})`}>
      {documentos.length > 0 && (
        <ul className="mb-4 divide-y divide-outline-variant">
          {documentos.map((d) => (
            <li key={d.id} className="flex items-center justify-between py-2">
              <Link
                href={`/api/loja-venda-documentos/${d.id}`}
                target="_blank"
                className="flex items-center gap-2 text-body-sm text-primary hover:underline"
              >
                <Paperclip size={14} /> {d.nomeOriginal}
              </Link>
              <Badge tone="info" size="sm">{d.tipo}</Badge>
            </li>
          ))}
        </ul>
      )}
      <form action={enviarDocumentoComId} className="flex flex-wrap items-end gap-3">
        <CampoSelect
          label="Tipo"
          name="tipo"
          defaultValue="Contrato"
          options={TIPOS_DOCUMENTO.map((t) => ({ value: t, label: t }))}
        />
        <input
          name="arquivo"
          type="file"
          required
          className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
        />
        <Button type="submit" variant="outlined" size="sm">
          Enviar Documento
        </Button>
      </form>
    </SectionCard>
  );

  const checklistNode = (
    <SectionCard title={`Checklist (${checklist.filter((c) => c.concluido).length}/${checklist.length})`}>
      {checklist.length > 0 && (
        <ul className="mb-4 space-y-2">
          {checklist.map((item) => (
            <li key={item.id} className="flex items-center gap-3">
              <ChecklistToggle vendaId={id} itemId={item.id} concluido={item.concluido} />
              <span className={item.concluido ? "text-outline line-through" : "text-primary"}>{item.descricao}</span>
            </li>
          ))}
        </ul>
      )}
      <form action={adicionarChecklistComId} className="flex items-end gap-3">
        <Campo label="Novo item" name="descricao" />
        <Button type="submit" variant="outlined" size="sm">
          Adicionar
        </Button>
      </form>
    </SectionCard>
  );

  const historico = (
    <SectionCard title="Histórico">
      <ul className="space-y-2 text-body-sm">
        <li className="text-primary">
          Venda criada em {new Date(venda.criadoEm).toLocaleDateString("pt-BR")}
          {orcamentoOrigem && (
            <>
              {" "}
              — convertida do orçamento{" "}
              <Link href={`/loja/orcamentos/${orcamentoOrigem.id}`} className="hover:underline">
                {orcamentoOrigem.numero}
              </Link>
            </>
          )}
        </li>
        {pagamentos.map((p) => (
          <li key={p.id} className="text-outline">
            Pagamento de {formatarMoeda(p.valor)} registrado em {new Date(p.criadoEm).toLocaleDateString("pt-BR")}
          </li>
        ))}
        {documentos.map((d) => (
          <li key={d.id} className="text-outline">
            Documento &ldquo;{d.nomeOriginal}&rdquo; ({d.tipo}) enviado em {new Date(d.criadoEm).toLocaleDateString("pt-BR")}
          </li>
        ))}
      </ul>
    </SectionCard>
  );

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja/vendas" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-headline-lg font-bold text-primary">Venda — {cliente.nome}</h1>
            <Badge tone={info.tone} size="sm">{info.label}</Badge>
          </div>
          <p className="text-body-sm text-outline">
            Cliente:{" "}
            <Link href={`/clientes/${cliente.id}`} className="hover:underline">
              {cliente.nome}
            </Link>
          </p>
        </div>
      </div>

      <VendaTabs resumo={resumo} financeiro={financeiro} documentos={documentosNode} checklist={checklistNode} historico={historico} />
    </div>
  );
}
