import { desc, eq } from "drizzle-orm";
import { Mail, FileText } from "lucide-react";
import { db } from "@/db";
import { templatesEmail, enviosEmail, clientes } from "@/db/schema";
import { StatusBadge, LinkButton, EmptyState, DataTable, BackButton, type Column } from "@/components/ui";
import { statusEnvio } from "@/lib/status";

type LinhaHistorico = {
  id: string;
  assunto: string;
  destinatario: string;
  status: string;
  clienteNome: string | null;
};

export default async function EmailsPage() {
  const templates = await db
    .select()
    .from(templatesEmail)
    .orderBy(desc(templatesEmail.criadoEm));

  const historico = await db
    .select({
      id: enviosEmail.id,
      assunto: enviosEmail.assunto,
      destinatario: enviosEmail.destinatario,
      status: enviosEmail.status,
      erro: enviosEmail.erro,
      criadoEm: enviosEmail.criadoEm,
      clienteNome: clientes.nome,
    })
    .from(enviosEmail)
    .leftJoin(clientes, eq(enviosEmail.clienteId, clientes.id))
    .orderBy(desc(enviosEmail.criadoEm));

  const columns: Column<LinhaHistorico>[] = [
    { header: "Cliente", cell: (h) => h.clienteNome ?? h.destinatario },
    { header: "Assunto", cell: (h) => h.assunto },
    { header: "Status", cell: (h) => <StatusBadge status={statusEnvio(h.status)} /> },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">Enviar E-mails</h1>
        <div className="flex gap-3">
          <LinkButton href="/emails/templates/novo" variant="outlined" size="sm">
            + Novo Template
          </LinkButton>
          <LinkButton href="/emails/enviar">Enviar E-mail</LinkButton>
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-title-lg font-semibold text-primary">
          Templates ({templates.length})
        </h2>
        {templates.length === 0 ? (
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            <EmptyState icon={FileText} title="Nenhum template criado ainda" />
          </div>
        ) : (
          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            <ul className="divide-y divide-outline-variant">
              {templates.map((t) => (
                <li key={t.id} className="flex items-center justify-between px-4 py-3 text-body-md">
                  <span>
                    <span className="font-medium text-primary">{t.nome}</span>{" "}
                    <span className="text-body-sm text-outline">— {t.tipo}</span>
                  </span>
                  <LinkButton href={`/emails/templates/${t.id}/editar`} variant="text" size="sm">
                    Editar
                  </LinkButton>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div>
        <h2 className="mb-3 font-display text-title-lg font-semibold text-primary">
          Histórico de Envios
        </h2>
        <DataTable
          columns={columns}
          rows={historico}
          rowKey={(h) => h.id}
          empty={<EmptyState icon={Mail} title="Nenhum e-mail enviado ainda" />}
        />
      </div>
    </div>
  );
}
