import { desc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { FileText, ShieldCheck, Camera, FolderOpen, Trash2, Download, Pencil } from "lucide-react";
import { db } from "@/db";
import { embarcacoesSparapan, embarcacaoSparapanArquivos } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { Button, ConfirmButton, LinkButton, BackButton, EmptyState } from "@/components/ui";
import { formatarDataBR } from "@/lib/datas";
import { UploadArquivoEmbarcacaoSparapan } from "./arquivo-form";
import { excluirArquivoEmbarcacaoSparapan, atualizarEmbarcacaoSparapan } from "../../actions";

const TIPOS = [
  { valor: "documento", rotulo: "Documentos", icon: FileText },
  { valor: "seguro", rotulo: "Seguro Obrigatório", icon: ShieldCheck },
  { valor: "foto", rotulo: "Fotos", icon: Camera },
  { valor: "outro", rotulo: "Outros", icon: FolderOpen },
] as const;

export default async function EmbarcacaoSparapanPastaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [embarcacao] = await db.select().from(embarcacoesSparapan).where(eq(embarcacoesSparapan.id, id)).limit(1);
  if (!embarcacao) notFound();

  const arquivos = await db
    .select()
    .from(embarcacaoSparapanArquivos)
    .where(eq(embarcacaoSparapanArquivos.embarcacaoId, id))
    .orderBy(desc(embarcacaoSparapanArquivos.criadoEm));

  const porTipo = (tipo: string) => arquivos.filter((a) => a.tipo === tipo);

  return (
    <div className="space-y-gutter">
      <BackButton href="/documentos-sparapan/embarcacoes" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">{embarcacao.nome}</h1>
          <p className="text-body-sm text-outline">
            {[embarcacao.tipo, embarcacao.numeroInscricao && `Inscrição ${embarcacao.numeroInscricao}`, embarcacao.anoFabricacao]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        <LinkButton href={`/documentos-sparapan/embarcacoes/${id}/editar`} variant="outlined" size="sm" icon={Pencil}>
          Editar
        </LinkButton>
      </div>

      {embarcacao.motor && (
        <p className="text-body-sm text-outline">Motor: {embarcacao.motor}{embarcacao.numeroSerie ? ` · Série ${embarcacao.numeroSerie}` : ""}</p>
      )}
      {embarcacao.observacoes && <p className="text-body-sm text-outline">{embarcacao.observacoes}</p>}

      <UploadArquivoEmbarcacaoSparapan embarcacaoId={id} />

      <div className="space-y-gutter">
        {TIPOS.map((tipo) => {
          const itens = porTipo(tipo.valor);
          const Icon = tipo.icon;
          return (
            <SectionCard key={tipo.valor} title={`${tipo.rotulo} (${itens.length})`}>
              {itens.length === 0 ? (
                <p className="text-body-sm text-outline">Nenhum arquivo nesta pasta ainda.</p>
              ) : (
                <ul className="divide-y divide-outline-variant">
                  {itens.map((a) => (
                    <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
                      <div className="flex items-center gap-2">
                        <Icon size={14} className="text-outline" />
                        <div>
                          <p className="text-body-md text-primary">{a.titulo}</p>
                          <p className="text-body-sm text-outline">Adicionado em {formatarDataBR(a.criadoEm, { comHora: true })}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={`/api/documentos-sparapan/embarcacoes/${a.id}`}
                          className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
                        >
                          <Download size={12} /> Abrir
                        </a>
                        <form action={excluirArquivoEmbarcacaoSparapan.bind(null, a.id)}>
                          <ConfirmButton mensagem={`Excluir "${a.titulo}"?`} variant="text" size="sm">
                            <Trash2 size={12} />
                          </ConfirmButton>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
