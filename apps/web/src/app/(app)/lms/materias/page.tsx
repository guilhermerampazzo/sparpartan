import { asc } from "drizzle-orm";
import { Trash2, GraduationCap } from "lucide-react";
import { db } from "@/db";
import { materias } from "@/db/schema";
import { Badge, LinkButton, EmptyState, DataTable, ConfirmButton, type Column, BackButton } from "@/components/ui";
import { iconeLms } from "@/lib/lms-icones";
import { excluirMateria } from "./actions";

type LinhaMateria = {
  id: string;
  titulo: string;
  descricao: string | null;
  icone: string | null;
  ativo: boolean;
};

export default async function MateriasPage() {
  const lista = await db.select().from(materias).orderBy(asc(materias.ordem));

  const columns: Column<LinhaMateria>[] = [
    {
      header: "Matéria",
      cell: (m) => {
        const Icone = iconeLms(m.icone);
        return (
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary-container text-on-primary-container">
              <Icone size={16} />
            </span>
            <span className="font-medium text-primary">{m.titulo}</span>
          </div>
        );
      },
    },
    { header: "Descrição", cell: (m) => m.descricao ?? "—" },
    {
      header: "Status",
      cell: (m) => (
        <Badge tone={m.ativo ? "success" : "neutral"} size="sm">
          {m.ativo ? "Ativa" : "Inativa"}
        </Badge>
      ),
    },
    {
      header: "",
      align: "right",
      cell: (m) => {
        const excluirComId = excluirMateria.bind(null, m.id);
        return (
          <form action={excluirComId}>
            <ConfirmButton
              mensagem={`Excluir a matéria "${m.titulo}"? Isso apaga todos os capítulos e aulas dela.`}
              variant="text"
              icon={<Trash2 size={12} />}
            >
              Excluir
            </ConfirmButton>
          </form>
        );
      },
    },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/escola" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">LMS — Matérias</h1>
        <LinkButton href="/lms/materias/novo">+ Nova Matéria</LinkButton>
      </div>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(m) => m.id}
        rowHref={(m) => `/lms/materias/${m.id}`}
        empty={
          <EmptyState
            icon={GraduationCap}
            title="Nenhuma matéria cadastrada"
            description="Crie a primeira matéria para começar a montar o curso."
            action={{ label: "+ Nova Matéria", href: "/lms/materias/novo" }}
          />
        }
      />
    </div>
  );
}
