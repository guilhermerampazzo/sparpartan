import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { Trash2, Paperclip } from "lucide-react";
import { db } from "@/db";
import { lojaProdutos, lojaProdutoFotos, lojaProdutoArquivos } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { Button, Badge, LinkButton, BackButton, ConfirmButton } from "@/components/ui";
import { rotuloCategoria, formatarMoeda } from "@/lib/loja";
import {
  excluirProdutoLoja,
  enviarFotoProdutoLoja,
  removerFotoProdutoLoja,
  enviarArquivoProdutoLoja,
  removerArquivoProdutoLoja,
} from "../actions";

export default async function ProdutoLojaDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [produto] = await db.select().from(lojaProdutos).where(eq(lojaProdutos.id, id)).limit(1);
  if (!produto) notFound();

  const fotos = await db.select().from(lojaProdutoFotos).where(eq(lojaProdutoFotos.produtoId, id));
  const arquivos = await db.select().from(lojaProdutoArquivos).where(eq(lojaProdutoArquivos.produtoId, id));

  const excluirComId = excluirProdutoLoja.bind(null, id);
  const enviarFotoComId = enviarFotoProdutoLoja.bind(null, id);
  const removerFotoComId = removerFotoProdutoLoja.bind(null, id);
  const enviarArquivoComId = enviarArquivoProdutoLoja.bind(null, id);
  const removerArquivoComId = removerArquivoProdutoLoja.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja/catalogo" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-headline-lg font-bold text-primary">{produto.nome}</h1>
            <Badge tone="info" size="sm">{rotuloCategoria(produto.categoria)}</Badge>
          </div>
          <p className="text-body-sm text-outline">{produto.fabricante ?? "Fabricante não informado"}</p>
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/loja/orcamentos/novo?produtoId=${id}`} variant="tonal">
            Criar Orçamento
          </LinkButton>
          <LinkButton href={`/loja/catalogo/${id}/editar`} variant="outlined">
            Editar
          </LinkButton>
          <form action={excluirComId}>
            <ConfirmButton mensagem={`Excluir o produto ${produto.nome}?`} icon={<Trash2 size={14} />}>
              Excluir
            </ConfirmButton>
          </form>
        </div>
      </div>

      <SectionCard title="Dados do Produto">
        <dl className="grid grid-cols-2 gap-4 text-body-md sm:grid-cols-4">
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Preço</dt>
            <dd className="text-primary">{formatarMoeda(produto.preco)}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Estoque</dt>
            <dd className="text-primary">{produto.estoque}</dd>
          </div>
        </dl>
        {produto.descricao && (
          <p className="mt-4 whitespace-pre-wrap text-body-md text-primary">{produto.descricao}</p>
        )}
        {produto.observacoes && (
          <div className="mt-4">
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Observações</dt>
            <p className="whitespace-pre-wrap text-body-md text-primary">{produto.observacoes}</p>
          </div>
        )}
      </SectionCard>

      <SectionCard title={`Fotos (${fotos.length})`}>
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fotos.map((foto) => (
            <div key={foto.id} className="space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-outline-variant">
                <Image src={`/api/loja-produto-fotos/${foto.id}`} alt="Foto do produto" fill className="object-cover" />
              </div>
              <form action={removerFotoComId.bind(null, foto.id)}>
                <Button type="submit" variant="outlined" size="sm">
                  Remover
                </Button>
              </form>
            </div>
          ))}
        </div>
        <form action={enviarFotoComId} className="flex items-end gap-3">
          <input
            name="foto"
            type="file"
            accept="image/*"
            required
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
          />
          <Button type="submit" variant="outlined" size="sm">
            Enviar Foto
          </Button>
        </form>
      </SectionCard>

      <SectionCard title={`Arquivos (${arquivos.length})`}>
        {arquivos.length > 0 && (
          <ul className="mb-4 divide-y divide-outline-variant">
            {arquivos.map((a) => (
              <li key={a.id} className="flex items-center justify-between py-2">
                <Link
                  href={`/api/loja-produto-arquivos/${a.id}`}
                  target="_blank"
                  className="flex items-center gap-2 text-body-sm text-primary hover:underline"
                >
                  <Paperclip size={14} /> {a.nomeOriginal}
                </Link>
                <form action={removerArquivoComId.bind(null, a.id)}>
                  <Button type="submit" variant="text" size="sm">
                    Remover
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={enviarArquivoComId} className="flex items-end gap-3">
          <input
            name="arquivo"
            type="file"
            required
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
          />
          <Button type="submit" variant="outlined" size="sm">
            Enviar Arquivo
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
