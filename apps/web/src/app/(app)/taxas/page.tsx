import { desc, eq, sql, and, lte, gte, isNotNull, inArray } from "drizzle-orm";
import { Landmark, Download, Trash2, Eye, AlarmClockOff, CalendarClock, CircleCheckBig } from "lucide-react";
import { db } from "@/db";
import { taxasPagar, clientes, processos, servicos } from "@/db/schema";
import { StatCard, Button, LinkButton, Badge, EmptyState, DataTable, ConfirmButton, type Column } from "@/components/ui";
import { marcarTaxaComoEmitida, marcarTaxaComoPaga, excluirTaxa } from "./actions";

function formatMoney(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type LinhaTaxa = {
  id: string;
  descricao: string;
  numero: string | null;
  valor: string;
  vencimento: string | null;
  status: "para_emissao" | "pendente" | "pago";
  arquivoCaminho: string | null;
  clienteNome: string | null;
  cpfCnpj: string | null;
  servicoNome: string | null;
};

function formatarData(d: string | null) {
  return d ? new Date(`${d}T00:00:00`).toLocaleDateString("pt-BR") : "—";
}

export default async function TaxasPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const statusValido =
    status === "para_emissao" || status === "pendente" || status === "pago" ? status : undefined;

  const naoPagas = ["para_emissao", "pendente"] as const;

  const [{ totalPendente }] = await db
    .select({ totalPendente: sql<number>`coalesce(sum(${taxasPagar.valor}), 0)::float` })
    .from(taxasPagar)
    .where(eq(taxasPagar.status, "pendente"));

  const hojeStr = new Date().toISOString().slice(0, 10);
  const inicioMes = hojeStr.slice(0, 8) + "01";

  const [[{ vencemHoje }], [{ atrasadas }], [{ pagasNoMes }]] = await Promise.all([
    db
      .select({ vencemHoje: sql<number>`count(*)::int` })
      .from(taxasPagar)
      .where(and(inArray(taxasPagar.status, naoPagas), eq(taxasPagar.vencimento, hojeStr))),
    db
      .select({ atrasadas: sql<number>`count(*)::int` })
      .from(taxasPagar)
      .where(and(inArray(taxasPagar.status, naoPagas), isNotNull(taxasPagar.vencimento), lte(taxasPagar.vencimento, hojeStr))),
    db
      .select({ pagasNoMes: sql<number>`count(*)::int` })
      .from(taxasPagar)
      .where(and(eq(taxasPagar.status, "pago"), isNotNull(taxasPagar.pagoEm), gte(sql`${taxasPagar.pagoEm}::date`, inicioMes))),
  ]);

  const lista = await db
    .select({
      id: taxasPagar.id,
      descricao: taxasPagar.descricao,
      numero: taxasPagar.numero,
      valor: taxasPagar.valor,
      vencimento: taxasPagar.vencimento,
      status: taxasPagar.status,
      arquivoCaminho: taxasPagar.arquivoCaminho,
      clienteNome: clientes.nome,
      cpfCnpj: clientes.cpfCnpj,
      servicoNome: servicos.nome,
    })
    .from(taxasPagar)
    .leftJoin(clientes, eq(taxasPagar.clienteId, clientes.id))
    .leftJoin(processos, eq(taxasPagar.processoId, processos.id))
    .leftJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(statusValido ? eq(taxasPagar.status, statusValido) : undefined)
    .orderBy(desc(taxasPagar.criadoEm));

  const columns: Column<LinhaTaxa>[] = [
    { header: "Cliente", cell: (t) => <span className="font-medium text-primary">{t.clienteNome ?? "—"}</span> },
    { header: "CPF", cell: (t) => <span className="whitespace-nowrap">{t.cpfCnpj ?? "—"}</span> },
    { header: "Descrição", cell: (t) => <span className="font-medium text-primary">{t.descricao}</span> },
    { header: "Nº GRU/Guia", cell: (t) => t.numero ?? "—" },
    { header: "Valor", cell: (t) => formatMoney(Number(t.valor)) },
    { header: "Vencimento", cell: (t) => <span className="whitespace-nowrap">{formatarData(t.vencimento)}</span> },
    {
      header: "Status",
      cell: (t) =>
        t.status === "pago" ? (
          <Badge tone="success" size="sm">Paga</Badge>
        ) : t.status === "para_emissao" ? (
          <Badge tone="neutral" size="sm">Para Emissão</Badge>
        ) : (
          <Badge tone="warning" size="sm">Aguardando Pagamento</Badge>
        ),
    },
    {
      header: "Boleto",
      cell: (t) =>
        t.arquivoCaminho ? (
          <div className="flex items-center gap-3">
            <a
              href={`/api/taxas/${t.id}?inline=1`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
            >
              <Eye size={12} /> Abrir
            </a>
            <a
              href={`/api/taxas/${t.id}`}
              className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
            >
              <Download size={12} /> Baixar
            </a>
          </div>
        ) : (
          "—"
        ),
    },
    {
      header: "",
      align: "right",
      cell: (t) => (
        <div className="flex items-center justify-end gap-2">
          {t.status === "para_emissao" ? (
            <form action={marcarTaxaComoEmitida.bind(null, t.id)}>
              <Button type="submit" variant="outlined" size="sm">
                Marcar Emitida
              </Button>
            </form>
          ) : t.status === "pendente" ? (
            <form action={marcarTaxaComoPaga.bind(null, t.id)}>
              <input type="hidden" name="formaPagamento" value="" />
              <Button type="submit" variant="outlined" size="sm">
                Marcar Paga
              </Button>
            </form>
          ) : (
            <span className="text-body-sm text-success">Paga</span>
          )}
          <form action={excluirTaxa.bind(null, t.id)}>
            <ConfirmButton
              mensagem={`Excluir a taxa "${t.descricao}"? O arquivo também será removido.`}
              variant="text"
              icon={<Trash2 size={12} />}
            >
              Excluir
            </ConfirmButton>
          </form>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Taxas</h1>
        <LinkButton href="/taxas/novo">+ Nova Taxa</LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-gutter lg:grid-cols-4">
        <StatCard label="Total pendente" value={formatMoney(totalPendente)} icon={Landmark} tone="warning" href="/taxas?status=pendente" />
        <StatCard label="Vencem hoje" value={vencemHoje} icon={CalendarClock} tone={vencemHoje > 0 ? "danger" : "success"} href="/taxas?status=pendente" />
        <StatCard label="Atrasadas" value={atrasadas} icon={AlarmClockOff} tone={atrasadas > 0 ? "danger" : "success"} href="/taxas?status=pendente" />
        <StatCard label="Pagas no mês" value={pagasNoMes} icon={CircleCheckBig} tone="success" href="/taxas?status=pago" />
      </div>

      <div className="flex gap-2">
        <LinkButton href="/taxas" variant={!statusValido ? "filled" : "outlined"} size="sm">
          Todas
        </LinkButton>
        <LinkButton href="/taxas?status=para_emissao" variant={statusValido === "para_emissao" ? "filled" : "outlined"} size="sm">
          Para Emissão
        </LinkButton>
        <LinkButton href="/taxas?status=pendente" variant={statusValido === "pendente" ? "filled" : "outlined"} size="sm">
          Aguardando Pagamento
        </LinkButton>
        <LinkButton href="/taxas?status=pago" variant={statusValido === "pago" ? "filled" : "outlined"} size="sm">
          Pagas
        </LinkButton>
      </div>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(t) => t.id}
        empty={
          <EmptyState
            icon={Landmark}
            title="Nenhuma taxa registrada ainda"
            action={{ label: "+ Nova Taxa", href: "/taxas/novo" }}
          />
        }
      />
    </div>
  );
}
