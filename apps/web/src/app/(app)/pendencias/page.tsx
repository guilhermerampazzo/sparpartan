import { asc, eq } from "drizzle-orm";
import { ClipboardList, Plus, RotateCcw, Archive, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { pendencias, clientes } from "@/db/schema";
import { Badge, Button, ConfirmButton, EmptyState, LinkButton, BackButton } from "@/components/ui";
import { auth } from "@/lib/auth";
import { PENDENCIA_CATEGORIAS, labelCategoria, labelPrioridade, diasAtePendencia, type PendenciaCategoria } from "@/lib/pendencias";
import { concluirPendencia, reabrirPendencia, arquivarPendencia } from "./actions";

const CATEGORIA_ICON_TONE: Record<string, "danger" | "warning" | "success" | "info" | "neutral"> = {
  clientes: "info",
  embarcacoes: "info",
  processos: "warning",
  financeiro: "danger",
  loja: "success",
  escola: "info",
  empresa: "neutral",
  pessoal: "neutral",
};

function prioridadeTone(p: string): "danger" | "warning" | "success" | "neutral" {
  if (p === "alta") return "danger";
  if (p === "media") return "warning";
  return "success";
}

function prioridadeSimbolo(p: string) {
  if (p === "alta") return "🔴";
  if (p === "media") return "🟡";
  return "🟢";
}

type Linha = {
  id: string;
  descricao: string;
  categoria: string;
  prioridade: string;
  status: string;
  data: string;
  horario: string | null;
  responsavel: string | null;
  clienteNome: string | null;
  observacoes: string | null;
  origem: string;
  privada: boolean;
  criadoPorId: string | null;
  concluidaEm: Date | null;
  criadoEm: Date;
};

function dataPt(data: string | Date): string {
  const d = data instanceof Date ? data : new Date(`${data}T00:00:00`);
  return d.toLocaleDateString("pt-BR");
}

function Grupo({ titulo, tom, linhas }: { titulo: string; tom: "danger" | "warning" | "success"; linhas: Linha[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
        <h2 className="font-display text-title-md font-semibold text-primary">{titulo}</h2>
        <Badge tone={tom} size="sm">{linhas.length}</Badge>
      </div>
      {linhas.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nenhuma pendência aqui" />
      ) : (
        <ul className="divide-y divide-outline-variant">
          {linhas.map((p) => (
            <li key={p.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-body-md font-medium text-primary">{p.descricao}</span>
                    <Badge tone={CATEGORIA_ICON_TONE[p.categoria] ?? "neutral"} size="sm">
                      {labelCategoria(p.categoria)}
                    </Badge>
                    <Badge tone={prioridadeTone(p.prioridade)} size="sm">
                      {prioridadeSimbolo(p.prioridade)} {labelPrioridade(p.prioridade)}
                    </Badge>
                    {p.privada && <Badge tone="neutral" size="sm">Privada</Badge>}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-outline">
                    {p.clienteNome && <span>{p.clienteNome}</span>}
                    {p.horario ? (
                      <span className="whitespace-nowrap">{dataPt(p.data)} às {p.horario}</span>
                    ) : (
                      <span className="whitespace-nowrap">{dataPt(p.data)}</span>
                    )}
                    {p.responsavel && <span>Responsável: {p.responsavel}</span>}
                    {p.observacoes && <span className="truncate text-outline">{p.observacoes}</span>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <LinkButton href={`/pendencias/${p.id}/editar`} variant="text" size="sm">
                    Editar
                  </LinkButton>
                  <form action={concluirPendencia.bind(null, p.id)}>
                    <Button type="submit" size="sm">Concluir</Button>
                  </form>
                  <form action={arquivarPendencia.bind(null, p.id)}>
                    <ConfirmButton mensagem={`Arquivar a pendência "${p.descricao}"?`} variant="text" icon={<Archive size={12} />}>
                      Arquivar
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default async function PendenciasPage({
  searchParams,
}: {
  searchParams: Promise<{ categoria?: string }>;
}) {
  const { categoria } = await searchParams;
  const categoriaValida = PENDENCIA_CATEGORIAS.some((c) => c.value === categoria)
    ? (categoria as PendenciaCategoria)
    : undefined;

  const session = await auth();
  const usuario = session?.user as { id?: string; tipo?: string } | undefined;
  const usuarioId = usuario?.tipo === "equipe" ? (usuario.id ?? null) : null;

  // Pendências pessoais só aparecem para o próprio dono. As demais são compartilhadas.
  const condicoes = categoriaValida ? eq(pendencias.categoria, categoriaValida) : undefined;

  const todas = await db
    .select({
      id: pendencias.id,
      descricao: pendencias.descricao,
      categoria: pendencias.categoria,
      prioridade: pendencias.prioridade,
      status: pendencias.status,
      data: pendencias.data,
      horario: pendencias.horario,
      responsavel: pendencias.responsavel,
      clienteNome: clientes.nome,
      observacoes: pendencias.observacoes,
      origem: pendencias.origem,
      privada: pendencias.privada,
      criadoPorId: pendencias.criadoPorId,
      concluidaEm: pendencias.concluidaEm,
      criadoEm: pendencias.criadoEm,
    })
    .from(pendencias)
    .leftJoin(clientes, eq(pendencias.clienteId, clientes.id))
    .where(condicoes)
    .orderBy(asc(pendencias.data), asc(pendencias.horario));

  const visiveis = todas.filter((p) => !p.privada || p.criadoPorId === usuarioId);
  const ativas = visiveis.filter((p) => p.status === "pendente");
  const historico = visiveis.filter((p) => p.status !== "pendente");

  const hoje = ativas.filter((p) => diasAtePendencia(p.data) <= 0);
  const semana = ativas.filter((p) => diasAtePendencia(p.data) >= 1 && diasAtePendencia(p.data) <= 7);
  const futuras = ativas.filter((p) => diasAtePendencia(p.data) > 7);

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">Central de Pendências</h1>
          <p className="text-body-sm text-outline">
            Todas as atividades, tarefas, vencimentos e acompanhamentos da empresa em um único lugar.
          </p>
        </div>
        <LinkButton href="/pendencias/nova" icon={Plus}>+ Nova Pendência</LinkButton>
      </div>

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/pendencias" variant={!categoriaValida ? "filled" : "outlined"} size="sm">
          Todas
        </LinkButton>
        {PENDENCIA_CATEGORIAS.map((c) => (
          <LinkButton
            key={c.value}
            href={`/pendencias?categoria=${c.value}`}
            variant={categoriaValida === c.value ? "filled" : "outlined"}
            size="sm"
          >
            {c.label}
          </LinkButton>
        ))}
      </div>

      <div className="space-y-gutter">
        <Grupo
          titulo="🔴 Pendências de Hoje"
          tom="danger"
          linhas={hoje}
        />
        <Grupo
          titulo="🟡 Próximos 7 dias"
          tom="warning"
          linhas={semana}
        />
        <Grupo
          titulo="🟢 Futuras"
          tom="success"
          linhas={futuras}
        />
      </div>

      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-title-md font-semibold text-primary">
            <ClipboardList size={16} /> Histórico (concluídas e arquivadas)
          </h2>
          <Badge tone="neutral" size="sm">{historico.length}</Badge>
        </div>
        {historico.length === 0 ? (
          <EmptyState icon={CheckCircle2} title="Nenhuma pendência no histórico ainda" />
        ) : (
          <ul className="divide-y divide-outline-variant">
            {historico.map((p) => {
              const concluida = p.status === "concluida";
              return (
                <li key={p.id} className="flex items-center justify-between gap-4 p-4 opacity-70">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className={`text-body-md text-primary ${concluida ? "line-through" : ""}`}>{p.descricao}</p>
                      <Badge tone={concluida ? "success" : "neutral"} size="sm">
                        {concluida ? "Concluída" : "Arquivada"}
                      </Badge>
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-outline">
                      <span>{labelCategoria(p.categoria)}</span>
                      {p.clienteNome && <span>{p.clienteNome}</span>}
                      <span>Prazo: {dataPt(p.data)}</span>
                      {p.concluidaEm && (
                        <span>
                          Concluída em: {p.concluidaEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
                        </span>
                      )}
                      {p.responsavel && <span>Responsável: {p.responsavel}</span>}
                    </div>
                  </div>
                  {concluida && (
                    <form action={reabrirPendencia.bind(null, p.id)}>
                      <Button type="submit" variant="text" size="sm" icon={RotateCcw}>
                        Reabrir
                      </Button>
                    </form>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
