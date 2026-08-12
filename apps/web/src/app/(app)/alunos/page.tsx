import { and, desc, ilike, or, count, sql } from "drizzle-orm";
import { GraduationCap } from "lucide-react";
import { db } from "@/db";
import { alunos, matriculas } from "@/db/schema";
import {
  Badge,
  LinkButton,
  EmptyState,
  DataTable,
  SearchBox,
  Pagination,
  paginar,
  type Column,
  BackButton,
} from "@/components/ui";

type LinhaAluno = {
  id: string;
  nome: string;
  email: string;
  telefone: string | null;
  ativo: boolean;
  matriculasAtivas: number;
};

export default async function AlunosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const { q, page } = await searchParams;

  const filtro = and(
    q ? or(ilike(alunos.nome, `%${q}%`), ilike(alunos.email, `%${q}%`)) : undefined
  );

  const [{ total }] = await db.select({ total: count() }).from(alunos).where(filtro);
  const { limit, offset, paginaAtual, totalPaginas } = paginar(Number(page) || 1, total);

  const lista = await db
    .select({
      id: alunos.id,
      nome: alunos.nome,
      email: alunos.email,
      telefone: alunos.telefone,
      ativo: alunos.ativo,
      matriculasAtivas: sql<number>`(
        select count(*)::int from ${matriculas}
        where ${matriculas.alunoId} = ${sql.raw('"alunos"."id"')}
          and ${matriculas.status} = 'ativo'
      )`,
    })
    .from(alunos)
    .where(filtro)
    .orderBy(desc(alunos.criadoEm))
    .limit(limit)
    .offset(offset);

  const columns: Column<LinhaAluno>[] = [
    { header: "Nome", cell: (a) => <span className="font-medium text-primary">{a.nome}</span> },
    { header: "E-mail", cell: (a) => a.email },
    { header: "Telefone", cell: (a) => a.telefone ?? "—" },
    {
      header: "Matrículas ativas",
      cell: (a) => <Badge tone={a.matriculasAtivas > 0 ? "info" : "neutral"} size="sm">{a.matriculasAtivas}</Badge>,
    },
    {
      header: "Status",
      cell: (a) => (
        <Badge tone={a.ativo ? "success" : "neutral"} size="sm">
          {a.ativo ? "Ativo" : "Inativo"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/escola" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Alunos</h1>
        <LinkButton href="/alunos/novo">+ Novo Aluno</LinkButton>
      </div>

      <SearchBox placeholder="Buscar por nome ou e-mail..." valorAtual={q} />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(a) => a.id}
        rowHref={(a) => `/alunos/${a.id}`}
        empty={
          <EmptyState
            icon={GraduationCap}
            title={q ? "Nenhum aluno encontrado" : "Nenhum aluno cadastrado ainda"}
            action={q ? undefined : { label: "+ Novo Aluno", href: "/alunos/novo" }}
          />
        }
      />

      <Pagination paginaAtual={paginaAtual} totalPaginas={totalPaginas} totalRegistros={total} baseParams={{ q }} />
    </div>
  );
}
