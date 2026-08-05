import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { templatesEmail } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { BackButton, LinkButton, Badge } from "@/components/ui";

export default async function VisualizarTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [template] = await db.select().from(templatesEmail).where(eq(templatesEmail.id, id)).limit(1);
  if (!template) notFound();

  return (
    <div className="space-y-gutter">
      <BackButton href="/emails" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">{template.nome}</h1>
          <p className="text-body-sm text-outline">
            Template de e-mail — use {"{{nome}}"} e {"{{email}}"} para substituir pelos dados do cliente.
          </p>
        </div>
        <div className="flex gap-3">
          <LinkButton href={`/emails/templates/${template.id}/editar`} variant="outlined">
            Editar
          </LinkButton>
          <LinkButton href="/emails" variant="text">
            Voltar
          </LinkButton>
        </div>
      </div>

      <SectionCard title="Detalhes">
        <dl className="grid grid-cols-1 gap-4 text-body-md sm:grid-cols-2">
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Tipo</dt>
            <dd>
              <Badge tone="neutral" size="sm">{template.tipo}</Badge>
            </dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Assunto</dt>
            <dd className="text-primary">{template.assunto}</dd>
          </div>
        </dl>
      </SectionCard>

      <SectionCard title="Corpo do E-mail">
        <div
          className="rounded-lg border border-outline-variant bg-surface p-4 text-body-md text-primary"
          dangerouslySetInnerHTML={{ __html: template.corpo }}
        />
        <details className="mt-4">
          <summary className="cursor-pointer text-body-sm text-primary hover:underline">
            Ver HTML
          </summary>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-outline-variant bg-surface p-4 font-mono text-xs text-primary">
            {template.corpo}
          </pre>
        </details>
      </SectionCard>
    </div>
  );
}
