import { desc } from "drizzle-orm";
import { BookMarked, Download, Trash2 } from "lucide-react";
import { db } from "@/db";
import { arquivosEmpresa } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { ConfirmButton, EmptyState } from "@/components/ui";
import { NovoArquivoEmpresaForm } from "./form";
import { excluirArquivoEmpresa } from "./actions";
import { rotuloCategoriaArquivoEmpresa } from "@/lib/arquivos-empresa";

export default async function DocumentosSparapanPage() {
  const lista = await db.select().from(arquivosEmpresa).orderBy(desc(arquivosEmpresa.criadoEm));

  const porCategoria = new Map<string, typeof lista>();
  for (const item of lista) {
    const grupo = porCategoria.get(item.categoria) ?? [];
    grupo.push(item);
    porCategoria.set(item.categoria, grupo);
  }

  return (
    <div className="space-y-gutter">
      <h1 className="font-display text-headline-lg font-bold text-primary">Documentos Sparapan</h1>
      <p className="max-w-2xl text-body-sm text-outline">
        Repositório interno da empresa: notas fiscais, contratos assinados, documentos de
        colaboradores, terceirizações, seguros, dados de embarcações e memoriais de processo.
      </p>

      <NovoArquivoEmpresaForm />

      {lista.length === 0 ? (
        <EmptyState icon={BookMarked} title="Nenhum documento cadastrado ainda" />
      ) : (
        [...porCategoria.entries()].map(([categoria, itens]) => (
          <SectionCard key={categoria} title={rotuloCategoriaArquivoEmpresa(categoria)}>
            <ul className="space-y-2">
              {itens.map((item) => (
                <li key={item.id} className="flex items-center justify-between rounded-lg border border-outline-variant px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-body-md text-primary">{item.titulo}</p>
                    {item.descricao && <p className="text-body-sm text-outline">{item.descricao}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <a
                      href={`/api/documentos-sparapan/${item.id}`}
                      className="inline-flex items-center gap-1 text-body-sm text-primary hover:underline"
                    >
                      <Download size={12} /> Baixar
                    </a>
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
    </div>
  );
}
