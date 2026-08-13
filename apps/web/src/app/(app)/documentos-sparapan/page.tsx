import { desc } from "drizzle-orm";
import { BookMarked, Download, Trash2, RefreshCcw, Ship } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { arquivosEmpresa, embarcacoesSparapan } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { ConfirmButton, EmptyState, BackButton, LinkButton } from "@/components/ui";
import { NovoArquivoEmpresaForm } from "./form";
import { excluirArquivoEmpresa, substituirArquivoEmpresa } from "./actions";
import { rotuloCategoriaArquivoEmpresa } from "@/lib/arquivos-empresa";
import { formatarDataBR } from "@/lib/datas";

export default async function DocumentosSparapanPage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string }>;
}) {
  const { aba } = await searchParams;
  const ambiente = aba === "embarcacoes" ? "embarcacoes" : "empresa";

  const lista = await db.select().from(arquivosEmpresa).orderBy(desc(arquivosEmpresa.criadoEm));
  const embarcacoes = await db.select().from(embarcacoesSparapan).orderBy(embarcacoesSparapan.nome);

  const porCategoria = new Map<string, typeof lista>();
  for (const item of lista) {
    const grupo = porCategoria.get(item.categoria) ?? [];
    grupo.push(item);
    porCategoria.set(item.categoria, grupo);
  }

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Documentos Sparapan</h1>
      <p className="max-w-2xl text-body-sm text-outline">
        Repositório interno da empresa em dois ambientes: documentação da empresa e pastas das
        embarcações Sparapan.
      </p>

      <div className="flex flex-wrap gap-2">
        <LinkButton href="/documentos-sparapan" variant={ambiente === "empresa" ? "filled" : "outlined"} size="sm">
          Documentação da empresa
        </LinkButton>
        <LinkButton href="/documentos-sparapan?aba=embarcacoes" variant={ambiente === "embarcacoes" ? "filled" : "outlined"} size="sm">
          Embarcações Sparapan
        </LinkButton>
      </div>

      {ambiente === "empresa" ? (
        <>
          <NovoArquivoEmpresaForm />

          {lista.length === 0 ? (
            <EmptyState icon={BookMarked} title="Nenhum documento cadastrado ainda" />
          ) : (
            [...porCategoria.entries()].map(([categoria, itens]) => (
              <SectionCard key={categoria} title={rotuloCategoriaArquivoEmpresa(categoria)}>
                <ul className="space-y-2">
                  {itens.map((item) => (
                    <li key={item.id} className="flex flex-wrap items-center justify-between rounded-lg border border-outline-variant px-4 py-3">
                      <div className="min-w-0">
                        <p className="text-body-md text-primary">{item.titulo}</p>
                        {item.descricao && <p className="text-body-sm text-outline">{item.descricao}</p>}
                        <p className="text-body-sm text-outline">Adicionado em {formatarDataBR(item.criadoEm, { comHora: true })}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <a
                          href={`/api/documentos-sparapan/${item.id}`}
                          className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
                        >
                          <Download size={12} /> Abrir
                        </a>
                        <SubstituirForm id={item.id} />
                        <form action={excluirArquivoEmpresa.bind(null, item.id)}>
                          <ConfirmButton
                            mensagem={`Excluir "${item.titulo}"? O arquivo também será removido.`}
                            variant="text"
                            icon={<Trash2 size={12} />}
                          >
                            Excluir
                          </ConfirmButton>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </SectionCard>
            ))
          )}
        </>
      ) : (
        <>
          {embarcacoes.length === 0 ? (
            <EmptyState
              icon={Ship}
              title="Nenhuma embarcação Sparapan cadastrada"
              description="Cadastre a primeira embarcação para abrir a pasta dela (documentos, seguro obrigatório, fotos e arquivos)."
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {embarcacoes.map((e) => (
                <Link
                  key={e.id}
                  href={`/documentos-sparapan/embarcacoes/${e.id}`}
                  className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card transition-shadow hover:shadow-card-hover"
                >
                  <span className="mb-3 inline-flex rounded-pill bg-primary-container p-2.5 text-on-primary-container">
                    <Ship size={18} />
                  </span>
                  <p className="font-display text-title-md font-semibold text-primary group-hover:underline">{e.nome}</p>
                  {e.numeroInscricao && <p className="mt-1 text-body-sm text-outline">Inscrição: {e.numeroInscricao}</p>}
                  {e.tipo && <p className="text-body-sm text-outline">{e.tipo}</p>}
                </Link>
              ))}
            </div>
          )}
          <LinkButton href="/documentos-sparapan/embarcacoes/nova" icon={Ship}>
            + Nova Embarcação Sparapan
          </LinkButton>
        </>
      )}
    </div>
  );
}

/** Substitui o PDF mantendo título/descrição — histórico fica no log de auditoria. */
function SubstituirForm({ id }: { id: string }) {
  return (
    <form action={substituirArquivoEmpresa.bind(null, id)} className="flex items-center gap-2">
      <input
        name="arquivo"
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        aria-label="Substituir arquivo"
        className="w-40 rounded-lg border border-outline-variant bg-surface px-2 py-1 text-xs text-primary outline-none focus:border-primary"
      />
      <button
        type="submit"
        className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
        title="Substituir documento"
      >
        <RefreshCcw size={12} /> Substituir
      </button>
    </form>
  );
}
