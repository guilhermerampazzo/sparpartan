import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";
import { db } from "@/db";
import { auditLog } from "@/db/schema";
import { auth } from "@/lib/auth";
import { LinkButton, Badge, EmptyState, DataTable, type Column, BackButton } from "@/components/ui";

type LinhaAuditoria = typeof auditLog.$inferSelect;

const ACAO_TONE: Record<string, "success" | "info" | "danger" | "neutral"> = {
  criar: "success",
  atualizar: "info",
  excluir: "danger",
  arquivar: "neutral",
  alterar_status: "info",
  login: "neutral",
};

const ACAO_LABEL: Record<string, string> = {
  criar: "Criar",
  atualizar: "Atualizar",
  excluir: "Excluir",
  arquivar: "Arquivar",
  alterar_status: "Alterar status",
  login: "Login",
};

export default async function AuditoriaPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") redirect("/configuracoes");

  const lista = await db.select().from(auditLog).orderBy(desc(auditLog.criadoEm)).limit(200);

  const columns: Column<LinhaAuditoria>[] = [
    { header: "Quando", cell: (l) => new Date(l.criadoEm).toLocaleString("pt-BR") },
    { header: "Usuário", cell: (l) => l.usuarioNome ?? "—" },
    {
      header: "Ação",
      cell: (l) => (
        <Badge tone={ACAO_TONE[l.acao] ?? "neutral"} size="sm">
          {ACAO_LABEL[l.acao] ?? l.acao}
        </Badge>
      ),
    },
    { header: "Entidade", cell: (l) => l.entidade },
    { header: "Detalhes", cell: (l) => l.detalhes ?? "—" },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">
          Log de Auditoria
        </h1>
        <BackButton href="/configuracoes" />
      </div>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(l) => l.id}
        empty={<EmptyState icon={ClipboardList} title="Nenhum evento registrado ainda" />}
      />
    </div>
  );
}
