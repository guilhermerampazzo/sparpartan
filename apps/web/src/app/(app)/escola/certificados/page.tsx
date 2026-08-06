import { desc, eq } from "drizzle-orm";
import { ScrollText, BadgeCheck, Trash2 } from "lucide-react";
import { db } from "@/db";
import { certificados, alunos, materias } from "@/db/schema";
import { BackButton, EmptyState, DataTable, StatusBadge, Button, type Column } from "@/components/ui";
import { statusCertificado } from "@/lib/status";
import { NovoCertificadoForm } from "./form";
import { marcarCertificadoEmitido, excluirCertificado } from "./actions";

type LinhaCertificado = {
  id: string;
  alunoNome: string;
  materiaNome: string | null;
  status: string;
  emitidoEm: Date | null;
  origem: string | null;
  criadoEm: Date;
};

export default async function CertificadosPage() {
  const lista = await db
    .select({
      id: certificados.id,
      alunoNome: alunos.nome,
      materiaNome: materias.titulo,
      status: certificados.status,
      emitidoEm: certificados.emitidoEm,
      origem: certificados.origem,
      criadoEm: certificados.criadoEm,
    })
    .from(certificados)
    .innerJoin(alunos, eq(certificados.alunoId, alunos.id))
    .leftJoin(materias, eq(certificados.materiaId, materias.id))
    .orderBy(desc(certificados.criadoEm));

  const listaAlunos = await db
    .select({ id: alunos.id, nome: alunos.nome })
    .from(alunos)
    .orderBy(alunos.nome);

  const listaMaterias = await db
    .select({ id: materias.id, titulo: materias.titulo })
    .from(materias)
    .orderBy(materias.titulo);

  const columns: Column<LinhaCertificado>[] = [
    {
      header: "Aluno",
      cell: (c) => <span className="font-medium text-primary">{c.alunoNome}</span>,
    },
    {
      header: "Matéria",
      cell: (c) => (c.materiaNome ? <span className="text-primary">{c.materiaNome}</span> : "—"),
    },
    {
      header: "Status",
      cell: (c) => <StatusBadge status={statusCertificado(c.status)} size="sm" />,
    },
    {
      header: "Origem",
      cell: (c) => (c.origem === "auto" ? <span className="text-body-sm text-outline">Automática (prova)</span> : <span className="text-body-sm text-outline">Manual</span>),
    },
    {
      header: "Emitido em",
      cell: (c) => (c.emitidoEm ? new Date(c.emitidoEm).toLocaleDateString("pt-BR") : "—"),
    },
    {
      header: "",
      align: "right",
      cell: (c) => (
        <div className="flex items-center justify-end gap-2">
          {c.status === "para_emitir" && (
            <form action={marcarCertificadoEmitido.bind(null, c.id)}>
              <Button type="submit" variant="outlined" size="sm" icon={BadgeCheck}>
                Marcar Emitido
              </Button>
            </form>
          )}
          <form action={excluirCertificado.bind(null, c.id)}>
            <Button type="submit" variant="text" size="sm" icon={Trash2}>
              Excluir
            </Button>
          </form>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/escola" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Certificados</h1>
      <p className="text-body-sm text-outline">
        Certificados &quot;para emitir&quot; aparecem na Central Operacional. Aprovações em provas do LMS
        geram certificados automaticamente.
      </p>

      <NovoCertificadoForm listaAlunos={listaAlunos} listaMaterias={listaMaterias} />

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(c) => c.id}
        empty={<EmptyState icon={ScrollText} title="Nenhum certificado cadastrado ainda" />}
      />
    </div>
  );
}
