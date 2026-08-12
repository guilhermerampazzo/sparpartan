import { and, isNotNull, gte, desc } from "drizzle-orm";
import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { clientes } from "@/db/schema";
import { LinkButton, Button, Badge, EmptyState, BackButton } from "@/components/ui";
import { restaurarCliente } from "../actions";

export default async function LixeiraPage() {
  const agora = new Date();
  const trintaDiasAtras = new Date(agora.getTime() - 30 * 86400000);

  const lista = await db
    .select()
    .from(clientes)
    .where(and(isNotNull(clientes.excluidoEm), gte(clientes.excluidoEm, trintaDiasAtras)))
    .orderBy(desc(clientes.excluidoEm));

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">
          Lixeira de Clientes
        </h1>
        <BackButton href="/clientes" />
      </div>
      <p className="text-body-sm text-outline">
        Clientes excluídos ficam aqui por 30 dias antes da remoção definitiva.
      </p>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {lista.length === 0 ? (
          <EmptyState icon={Trash2} title="Lixeira vazia" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {lista.map((c) => {
              const restaurarComId = restaurarCliente.bind(null, c.id);
              const diasRestantes = c.excluidoEm
                ? 30 - Math.floor((agora.getTime() - new Date(c.excluidoEm).getTime()) / 86400000)
                : 0;
              return (
                <li key={c.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-body-md font-medium text-primary">{c.nome}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <p className="text-body-sm text-outline">
                        Excluído em {c.excluidoEm ? new Date(c.excluidoEm).toLocaleDateString("pt-BR") : "—"}
                      </p>
                      <Badge tone={diasRestantes <= 7 ? "danger" : "neutral"} size="sm">
                        {diasRestantes}d restantes
                      </Badge>
                    </div>
                  </div>
                  <form action={restaurarComId}>
                    <Button type="submit" variant="outlined" size="sm">
                      Restaurar
                    </Button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
