import { desc, eq, inArray } from "drizzle-orm";
import { FolderClock, Receipt, AlarmClock, Link2, CreditCard } from "lucide-react";
import { db } from "@/db";
import { processos, clientes, servicos, orcamentos, pagamentos, lembretes, solicitacoes, servicosContratados } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { StatusBadge, EmptyState, Button } from "@/components/ui";
import { statusProcesso, statusOrcamento, rotuloPrazo } from "@/lib/status";
import Link from "next/link";
import { PendenciaForm } from "./form";
import { resolverPendencia } from "./actions";

function formatMoney(v: string) {
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export default async function PendentesPage() {
  const processosPendentes = await db
    .select({ id: processos.id, status: processos.status, clienteNome: clientes.nome, servicoNome: servicos.nome })
    .from(processos)
    .innerJoin(clientes, eq(processos.clienteId, clientes.id))
    .innerJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(inArray(processos.status, ["documentos_pendentes", "pronto_para_protocolo"] as const))
    .orderBy(desc(processos.atualizadoEm));

  const orcamentosPendentes = await db
    .select({ id: orcamentos.id, numero: orcamentos.numero, valor: orcamentos.valor, clienteNome: clientes.nome, status: orcamentos.status })
    .from(orcamentos)
    .innerJoin(clientes, eq(orcamentos.clienteId, clientes.id))
    .where(eq(orcamentos.status, "pendente"))
    .orderBy(desc(orcamentos.criadoEm));

  const pagamentosAtrasados = await db
    .select({ id: pagamentos.id, valor: pagamentos.valor, dataVencimento: pagamentos.dataVencimento, clienteNome: clientes.nome })
    .from(pagamentos)
    .innerJoin(servicosContratados, eq(pagamentos.servicoContratadoId, servicosContratados.id))
    .innerJoin(clientes, eq(servicosContratados.clienteId, clientes.id))
    .where(eq(pagamentos.status, "atrasado"))
    .orderBy(pagamentos.dataVencimento);

  const lembretesAbertos = await db
    .select({
      id: lembretes.id,
      mensagem: lembretes.mensagem,
      clienteNome: clientes.nome,
      dataLembrete: lembretes.dataLembrete,
      origem: lembretes.origem,
    })
    .from(lembretes)
    .leftJoin(clientes, eq(lembretes.clienteId, clientes.id))
    .where(eq(lembretes.resolvido, false))
    .orderBy(desc(lembretes.dataLembrete));

  const solicitacoesSemResposta = await db
    .select({ id: solicitacoes.id, tipo: solicitacoes.tipo, clienteNome: clientes.nome, expiraEm: solicitacoes.expiraEm })
    .from(solicitacoes)
    .leftJoin(clientes, eq(solicitacoes.clienteId, clientes.id))
    .where(eq(solicitacoes.status, "pendente"))
    .orderBy(desc(solicitacoes.criadoEm));

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Pendentes</h1>
      <p className="text-body-sm text-outline">Tudo que precisa da sua atenção, num só lugar.</p>

      <SectionCard title="Processos não protocolados">
        {processosPendentes.length === 0 ? (
          <EmptyState icon={FolderClock} title="Nenhum processo aguardando protocolo" />
        ) : (
          <ul className="space-y-2">
            {processosPendentes.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3">
                <Link href={`/processos/${p.id}`} className="text-body-md text-primary hover:underline">
                  {p.servicoNome} — {p.clienteNome}
                </Link>
                <StatusBadge status={statusProcesso(p.status)} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Orçamentos aguardando decisão">
        {orcamentosPendentes.length === 0 ? (
          <EmptyState icon={Receipt} title="Nenhum orçamento pendente" />
        ) : (
          <ul className="space-y-2">
            {orcamentosPendentes.map((o) => (
              <li key={o.id} className="flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3">
                <Link href={`/orcamentos/${o.id}`} className="text-body-md text-primary hover:underline">
                  {o.numero} — {o.clienteNome} — {formatMoney(o.valor)}
                </Link>
                <StatusBadge status={statusOrcamento(o.status)} size="sm" />
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Pagamentos atrasados">
        {pagamentosAtrasados.length === 0 ? (
          <EmptyState icon={CreditCard} title="Nenhum pagamento atrasado" />
        ) : (
          <ul className="space-y-2">
            {pagamentosAtrasados.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3">
                <span className="text-body-md text-primary">{p.clienteNome} — {formatMoney(p.valor)}</span>
                <span className="text-body-sm text-outline">venceu em {p.dataVencimento}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Links enviados sem resposta">
        {solicitacoesSemResposta.length === 0 ? (
          <EmptyState icon={Link2} title="Nenhum link em aberto" />
        ) : (
          <ul className="space-y-2">
            {solicitacoesSemResposta.map((s) => (
              <li key={s.id} className="flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3">
                <span className="text-body-md text-primary">{s.tipo} — {s.clienteNome ?? "cliente novo"}</span>
                <span className="text-body-sm text-outline">expira {new Date(s.expiraEm).toLocaleDateString("pt-BR")}</span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <SectionCard title="Nova pendência">
        <PendenciaForm />
      </SectionCard>

      <SectionCard title="Lembretes abertos">
        {lembretesAbertos.length === 0 ? (
          <EmptyState icon={AlarmClock} title="Nenhum lembrete aberto" />
        ) : (
          <ul className="space-y-2">
            {lembretesAbertos.map((l) => {
              const resolverComId = resolverPendencia.bind(null, l.id);
              return (
                <li
                  key={l.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant px-4 py-3"
                >
                  <div>
                    <span className="text-body-md text-primary">{l.mensagem}</span>
                    <div className="mt-1 text-body-sm text-outline">
                      {l.clienteNome && <span>{l.clienteNome} · </span>}
                      {rotuloPrazo(l.dataLembrete)}
                      {l.origem === "manual" && <span> · manual</span>}
                    </div>
                  </div>
                  <form action={resolverComId}>
                    <Button type="submit" variant="outlined" size="sm">
                      Resolver
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
