import { GraduationCap, Ship, Anchor, HardHat, type LucideIcon } from "lucide-react";

export type ModuloDocumento = {
  slug: string;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  /** Categorias de `modelos_documento.categoria` que pertencem a este módulo. */
  categorias: string[];
};

/**
 * Os 4 módulos de preenchimento de documentos — um por setor, para cada setor
 * só ver os modelos da sua finalidade (evita erro de preenchimento). O quinto
 * item ("cadastro de obras") vive dentro do módulo de obras.
 */
export const MODULOS_DOCUMENTO: ModuloDocumento[] = [
  {
    slug: "escola-nautica",
    titulo: "Escola Náutica",
    descricao: "Requerimentos e formulários de habilitação: Arrais Amador, Motonauta e Carteira de Trabalho Náutico.",
    icon: GraduationCap,
    categorias: [
      "Habilitação Náutica — Arrais Amador",
      "Habilitação Náutica — Motonauta",
      "Carteira de Trabalho Náutico",
    ],
  },
  {
    slug: "esporte-recreio",
    titulo: "Embarcações Esporte e Recreio",
    descricao: "Inscrição e documentação de embarcações de esporte e recreio (NORMAM-211), incluindo jetski.",
    icon: Ship,
    categorias: ["Embarcação", "Jetski"],
  },
  {
    slug: "comerciais",
    titulo: "Embarcações Comerciais",
    descricao: "Inscrição e documentação de embarcações comerciais (NORMAM-202).",
    icon: Anchor,
    categorias: ["Embarcação Comercial"],
  },
  {
    slug: "obras-nauticas",
    titulo: "Obras Náuticas",
    descricao: "Memorial Descritivo e Requerimento 2-B-1 (NORMAM-303) para trapiches, flutuantes e marinas.",
    icon: HardHat,
    categorias: ["Obras (NORMAM-303)"],
  },
];

export function moduloPorSlug(slug: string): ModuloDocumento | undefined {
  return MODULOS_DOCUMENTO.find((m) => m.slug === slug);
}

/** Categorias de todos os módulos, em ordem — útil para filtros/agrupamentos. */
export const TODAS_CATEGORIAS_MODULOS: string[] = MODULOS_DOCUMENTO.flatMap((m) => m.categorias);
