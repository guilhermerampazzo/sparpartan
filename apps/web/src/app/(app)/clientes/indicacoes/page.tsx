import Link from "next/link";
import { sql, isNotNull } from "drizzle-orm";
import { Users2 } from "lucide-react";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { LinkButton, EmptyState, BarChart, BackButton } from "@/components/ui";

export default async function IndicacoesPage() {
  const ranking = await db
    .select({
      indicadoPor: clientes.indicadoPor,
      total: sql<number>`count(*)::int`,
    })
    .from(clientes)
    .where(isNotNull(clientes.indicadoPor))
    .groupBy(clientes.indicadoPor)
    .orderBy(sql`count(*) desc`);

  const indicados = await db
    .select({ id: clientes.id, nome: clientes.nome, indicadoPor: clientes.indicadoPor })
    .from(clientes)
    .where(isNotNull(clientes.indicadoPor));

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">
          Relatório de Indicações
        </h1>
        <BackButton href="/clientes" />
      </div>

      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-6">
        <h2 className="mb-4 font-display text-title-lg font-semibold text-primary">
          Ranking de Indicadores
        </h2>
        {ranking.length === 0 ? (
          <EmptyState icon={Users2} title="Nenhuma indicação registrada ainda" />
        ) : (
          <BarChart
            orientation="horizontal"
            data={ranking.map((r) => ({ label: r.indicadoPor ?? "—", value: r.total }))}
          />
        )}
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <p className="border-b border-outline-variant px-4 py-3 font-mono-caps text-label-sm uppercase tracking-wide text-outline">
          Clientes Indicados
        </p>
        {indicados.length === 0 ? (
          <p className="p-6 text-body-sm text-outline">Nenhum cliente indicado ainda.</p>
        ) : (
          <ul className="divide-y divide-outline-variant">
            {indicados.map((c) => (
              <li key={c.id} className="px-4 py-3 text-body-md">
                <Link href={`/clientes/${c.id}`} className="font-medium text-primary hover:underline">
                  {c.nome}
                </Link>{" "}
                <span className="text-body-sm text-outline">— indicado por {c.indicadoPor}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
