import { asc, eq } from "drizzle-orm";
import { ClipboardList, Plus, RotateCcw, Archive, CheckCircle2, ArrowRight, User, FileStack } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { pendencias, clientes, processos, servicos } from "@/db/schema";
import { Badge, Button, ConfirmButton, EmptyState, LinkButton, BackButton } from "@/components/ui";
import { auth } from "@/lib/auth";
import { PENDENCIA_CATEGORIAS, labelCategoria, labelPrioridade, diasAtePendencia, type PendenciaCategoria } from "@/lib/pendencias";
import { concluirPendencia, reabrirPendencia, arquivarPendencia, restaurarPendencia } from "./actions";

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
  clienteId: string | null;
  processoId: string | null;
  servicoProcesso: string | null;
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

/** Destino do "Dar andamento": processo → cliente → edição da pendência. */
function destinoAndamento(p: Linha): string {
  if (p.processoId) return `/processos/${p.processoId}`;
  if (p.clienteId) return `/clientes/${p.clienteId}`;
  return `/pendencias/${p.id}/editar`;
}

function PendenciaCard({ p }: { p: Linha }) {
  const dias = diasAtePendencia(p.data);
  const prazoTone = dias < 0 ? "text-danger" : dias <= 3 ? "text-warning" : "text-outline";
  const destino = destinoAndamento(p);

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 flex-1 text-body-md font-medium text-primary">{p.descricao}</p>
        <Badge tone={CATEGORIA_ICON_TONE[p.categoria] ?? "neutral"} size="sm">
          {labelCategoria(p.categoria)}
        </Badge>
        <Badge tone={prioridadeTone(p.prioridade)} size="sm">
          {prioridadeSimbolo(p.prioridade)} {labelPrioridade(p.prioridade)}
        </Badge>
        {p.privada && <Badge tone="neutral" size="sm">Privada</Badge>}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-outline">
        {p.clienteId && p.clienteNome ? (
          <Link href={`/clientes/${p.clienteId}`} className="flex items-center gap-1 font-medium text-primary hover:underline">
            <User size={12} /> {p.clienteNome}
          </Link>
        ) : (
          p.clienteNome && (
            <span className="flex items-center gap-1">
              <User size={12} /> {p.clienteNome}
            </span>
          )
        )}
        {p.processoId && p.servicoProcesso && (
          <Link href={`/processos/${p.processoId}`} className="flex items-center gap-1 font-medium text-primary hover:underline">
            <FileStack size={12} /> {p.servicoProcesso}
          </Link>
        )}
        <span className={`whitespace-nowrap ${prazoTone}`}>
          Prazo: {dataPt(p.data)}
          {p.horario ? ` às ${p.horario}` : ""}
        </span>
        {p.responsavel && <span>Resp.: {p.responsavel}</span>}
      </div>

      {p.observacoes && <p className="text-body-sm text-outline">{p.observacoes}</p>}

      <div className="flex flex-wrap items-center gap-2 border-t border-outline-variant/60 pt-3">
        <LinkButton href={destino} size="sm" icon={ArrowRight}>
          Dar andamento
        </LinkButton>
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
  );
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
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2 xl:grid-cols-3">
          {linhas.map((p) => (
            <PendenciaCard key={p.id} p={p} />
          ))}
        </div>
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
      clienteId: clientes.id,
      processoId: pendencias.processoId,
      servicoProcesso: servicos.nome,
      observacoes: pendencias.observacoes,
      origem: pendencias.origem,
      privada: pendencias.privada,
      criadoPorId: pendencias.criadoPorId,
      concluidaEm: pendencias.concluidaEm,
      criadoEm: pendencias.criadoEm,
    })
    .from(pendencias)
    .leftJoin(clientes, eq(pendencias.clienteId, clientes.id))
    .leftJoin(processos, eq(pendencias.processoId, processos.id))
    .leftJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(condicoes)
    .orderBy(asc(pendencias.data), asc(pendencias.horario));

  const visiveis = todas.filter((p) => !p.privada || p.criadoPorId === usuarioId);
  const ativas = visiveis.filter((p) => p.status === "pendente");
  const concluidas = visiveis.filter((p) => p.status === "concluida");
  const arquivadas = visiveis.filter((p) => p.status === "arquivada");

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
            Painel operacional — cada pendência mostra o motivo, o cliente e o processo, com acesso direto ao módulo para dar andamento.
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
        <Grupo titulo="🔴 Pendências de Hoje" tom="danger" linhas={hoje} />
        <Grupo titulo="🟡 Próximos 7 dias" tom="warning" linhas={semana} />
        <Grupo titulo="🟢 Futuras" tom="success" linhas={futuras} />
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-2">
        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-title-md font-semibold text-primary">
              <CheckCircle2 size={16} /> Concluídas
            </h2>
            <Badge tone="success" size="sm">{concluidas.length}</Badge>
          </div>
          {concluidas.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nenhuma concluída ainda" />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {concluidas.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 p-4 opacity-70">
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md text-primary line-through">{p.descricao}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-outline">
                      <span>{labelCategoria(p.categoria)}</span>
                      {p.clienteNome && <span>{p.clienteNome}</span>}
                      {p.concluidaEm && (
                        <span>Concluída em: {p.concluidaEm.toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}</span>
                      )}
                    </div>
                  </div>
                  <form action={reabrirPendencia.bind(null, p.id)}>
                    <Button type="submit" variant="text" size="sm" icon={RotateCcw}>
                      Reabrir
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
          <div className="flex items-center justify-between border-b border-outline-variant px-4 py-3">
            <h2 className="flex items-center gap-2 font-display text-title-md font-semibold text-primary">
              <Archive size={16} /> Arquivadas
            </h2>
            <Badge tone="neutral" size="sm">{arquivadas.length}</Badge>
          </div>
          {arquivadas.length === 0 ? (
            <EmptyState icon={Archive} title="Nenhuma arquivada — nada perdido" />
          ) : (
            <ul className="divide-y divide-outline-variant">
              {arquivadas.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-4 p-4 opacity-70">
                  <div className="min-w-0 flex-1">
                    <p className="text-body-md text-primary">{p.descricao}</p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-body-sm text-outline">
                      <span>{labelCategoria(p.categoria)}</span>
                      {p.clienteNome && <span>{p.clienteNome}</span>}
                      <span>Prazo: {dataPt(p.data)}</span>
                    </div>
                  </div>
                  <form action={restaurarPendencia.bind(null, p.id)}>
                    <Button type="submit" variant="text" size="sm" icon={RotateCcw}>
                      Restaurar
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
