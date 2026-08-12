import { eq, sql } from "drizzle-orm";
import { AlertOctagon, AlertTriangle, Clock, ShieldCheck, FileClock } from "lucide-react";
import { db } from "@/db";
import { documentosGerados, modelosDocumento, clientes } from "@/db/schema";
import { StatCard, Badge, EmptyState, DataTable, type Column, BackButton } from "@/components/ui";
import { urgenciaVencimento, infoUrgencia, rotuloPrazo, type Urgencia } from "@/lib/status";

const FILTROS: { key: Urgencia; label: string; icon: typeof AlertOctagon }[] = [
  { key: "vencido", label: "Vencidos", icon: AlertOctagon },
  { key: "critico", label: "Vence em 7 dias", icon: AlertTriangle },
  { key: "atencao", label: "Vence em 30 dias", icon: Clock },
  { key: "em_dia", label: "Em Dia", icon: ShieldCheck },
];

type LinhaDocumento = {
  id: string;
  vencimento: string | null;
  modeloNome: string;
  clienteNome: string;
};

export default async function VencimentosPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>;
}) {
  const { filtro = "vencido" } = await searchParams;

  const todos = await db
    .select({
      id: documentosGerados.id,
      vencimento: documentosGerados.vencimento,
      modeloNome: modelosDocumento.nome,
      clienteNome: clientes.nome,
    })
    .from(documentosGerados)
    .innerJoin(modelosDocumento, eq(documentosGerados.modeloId, modelosDocumento.id))
    .innerJoin(clientes, eq(documentosGerados.clienteId, clientes.id))
    .where(sql`${documentosGerados.vencimento} is not null`);

  const contagens: Record<Urgencia, number> = {
    vencido: 0,
    critico: 0,
    atencao: 0,
    em_dia: 0,
    sem_data: 0,
  };
  for (const d of todos) contagens[urgenciaVencimento(d.vencimento)]++;

  const filtrados = todos.filter((d) => urgenciaVencimento(d.vencimento) === filtro);

  const columns: Column<LinhaDocumento>[] = [
    { header: "Documento", cell: (d) => <span className="font-medium text-primary">{d.modeloNome}</span> },
    { header: "Cliente", cell: (d) => d.clienteNome },
    {
      header: "Vencimento",
      cell: (d) => (
        <div className="flex items-center gap-2">
          <span>{d.vencimento && rotuloPrazo(d.vencimento)}</span>
          <Badge tone={infoUrgencia(urgenciaVencimento(d.vencimento)).tone} size="sm">
            {d.vencimento}
          </Badge>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/documentos" />
      <h1 className="font-display text-headline-lg font-bold text-primary">
        Vencimento de Documentos
      </h1>

      <div className="grid grid-cols-2 gap-gutter sm:grid-cols-4">
        {FILTROS.map((f) => (
          <StatCard
            key={f.key}
            label={f.label}
            value={contagens[f.key]}
            icon={f.icon}
            tone={infoUrgencia(f.key).tone}
            href={`/documentos/vencimentos?filtro=${f.key}`}
            active={filtro === f.key}
          />
        ))}
      </div>

      <DataTable
        columns={columns}
        rows={filtrados}
        rowKey={(d) => d.id}
        rowHref={(d) => `/documentos/${d.id}`}
        empty={<EmptyState icon={FileClock} title="Nenhum documento nesse filtro" />}
      />
    </div>
  );
}
