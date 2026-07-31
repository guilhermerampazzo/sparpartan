import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FileText, Trash2 } from "lucide-react";
import { db } from "@/db";
import { servicos, requisitosDocumento } from "@/db/schema";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { Button, ConfirmButton, LinkButton, Badge, EmptyState, BackButton } from "@/components/ui";
import { criarRequisitoDocumento, removerRequisitoDocumento, excluirServico } from "../actions";

export default async function ServicoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [servico] = await db.select().from(servicos).where(eq(servicos.id, id)).limit(1);
  if (!servico) notFound();

  const requisitos = await db
    .select()
    .from(requisitosDocumento)
    .where(eq(requisitosDocumento.servicoId, id))
    .orderBy(requisitosDocumento.criadoEm);

  const criarRequisitoComId = criarRequisitoDocumento.bind(null, id);
  const excluirComId = excluirServico.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/servicos" />
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">{servico.nome}</h1>
        <div className="flex gap-2">
          <LinkButton href={`/servicos/${id}/editar`} variant="outlined" size="sm">
            Editar
          </LinkButton>
          <form action={excluirComId}>
            <ConfirmButton
              mensagem={`Excluir o serviço "${servico.nome}"? Ele deixará de aparecer nas listagens.`}
              size="sm"
              icon={<Trash2 size={12} />}
            >
              Excluir
            </ConfirmButton>
          </form>
        </div>
      </div>

      <SectionCard title="Documentos que o cliente precisa entregar">
        <p className="mb-4 text-body-sm text-outline">
          Esta lista é usada no link público de cobrança de documentos: o cliente vê exatamente o
          que falta e envia por ali.
        </p>

        {requisitos.length === 0 ? (
          <EmptyState icon={FileText} title="Nenhum requisito cadastrado ainda" />
        ) : (
          <ul className="mb-6 space-y-2">
            {requisitos.map((r) => {
              const removerComId = removerRequisitoDocumento.bind(null, id, r.id);
              return (
                <li
                  key={r.id}
                  className="flex items-center justify-between gap-4 rounded-lg border border-outline-variant px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-body-md text-primary">{r.nome}</span>
                    {r.obrigatorio && (
                      <Badge tone="warning" size="sm">
                        Obrigatório
                      </Badge>
                    )}
                  </div>
                  <form action={removerComId}>
                    <ConfirmButton
                      mensagem={`Remover o requisito "${r.nome}"?`}
                      variant="text"
                      icon={<Trash2 size={12} />}
                    >
                      Remover
                    </ConfirmButton>
                  </form>
                </li>
              );
            })}
          </ul>
        )}

        <form action={criarRequisitoComId} className="flex flex-wrap items-end gap-4">
          <div className="w-64">
            <Campo label="Nome do documento" name="nome" required />
          </div>
          <label className="flex items-center gap-2 pb-2 text-body-sm text-primary">
            <input type="checkbox" name="obrigatorio" defaultChecked className="size-4" />
            Obrigatório
          </label>
          <Button type="submit" size="sm">
            Adicionar
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
