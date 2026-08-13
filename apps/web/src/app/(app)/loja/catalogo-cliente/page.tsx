import { asc, eq } from "drizzle-orm";
import { ShoppingCart } from "lucide-react";
import { db } from "@/db";
import { lojaProdutos, lojaProdutoFotos } from "@/db/schema";
import { BackButton, LinkButton } from "@/components/ui";
import { CatalogoCliente } from "./catalogo-cliente";

export default async function CatalogoClientePage() {
  const produtos = await db
    .select()
    .from(lojaProdutos)
    .where(eq(lojaProdutos.ativo, true))
    .orderBy(asc(lojaProdutos.nome));

  const fotos = await db.select().from(lojaProdutoFotos).orderBy(asc(lojaProdutoFotos.criadoEm));

  const itens = produtos.map((p) => ({
    id: p.id,
    nome: p.nome,
    categoria: p.categoria,
    marca: p.marca ?? p.fabricante ?? "",
    descricao: p.descricao ?? "",
    fichaTecnica: p.fichaTecnica ?? "",
    preco: p.precoPromocional ?? p.preco,
    disponibilidade: p.disponibilidade ?? "estoque",
    estoque: p.estoque,
    fotoId: fotos.find((f) => f.produtoId === p.id)?.id ?? null,
    caracteristicas: [p.anoFabricacao, p.potencia, p.numeroSerie].filter(Boolean).join(" · "),
  }));

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">Catálogo da Loja</h1>
          <p className="text-body-sm text-outline">
            Visualização comercial — selecione os produtos e monte o carrinho.
          </p>
        </div>
        <LinkButton href="/loja/carrinho" variant="outlined" icon={ShoppingCart}>
          Ver carrinho
        </LinkButton>
      </div>

      <CatalogoCliente itens={itens} />
    </div>
  );
}
