import { GraduationCap, Zap, Ship, Anchor, HardHat, FileText, type LucideIcon } from "lucide-react";

export type ModuloDocumento = {
  slug: string;
  titulo: string;
  descricao: string;
  icon: LucideIcon;
  /** Categorias de `modelos_documento.categoria` que pertencem a este módulo. */
  categorias: string[];
};

/**
 * Áreas de documentos por serviço — cada serviço tem sua própria área
 * (nada de todos os ícones levarem para a mesma tela).
 */
export const MODULOS_DOCUMENTO: ModuloDocumento[] = [
  {
    slug: "arrais-amador",
    titulo: "Arrais Amador",
    descricao: "Requerimentos e formulários da habilitação de Arrais Amador.",
    icon: GraduationCap,
    categorias: ["Habilitação Náutica — Arrais Amador"],
  },
  {
    slug: "motonauta",
    titulo: "Motonauta",
    descricao: "Requerimentos e formulários da habilitação de Motonauta.",
    icon: Zap,
    categorias: ["Habilitação Náutica — Motonauta"],
  },
  {
    slug: "embarcacao",
    titulo: "Embarcação Esporte e Recreio",
    descricao: "Inscrição e documentação de embarcações de esporte e recreio (NORMAM-211), incluindo jetski.",
    icon: Ship,
    categorias: ["Embarcação", "Jetski"],
  },
  {
    slug: "embarcacao-comercial",
    titulo: "Embarcação Comercial",
    descricao: "Inscrição e documentação de embarcações comerciais (NORMAM-202).",
    icon: Anchor,
    categorias: ["Embarcação Comercial"],
  },
  {
    slug: "obras",
    titulo: "Obras Náuticas",
    descricao: "Memorial Descritivo e Requerimento 2-B-1 (NORMAM-303) para trapiches, flutuantes e marinas.",
    icon: HardHat,
    categorias: ["Obras (NORMAM-303)"],
  },
  {
    slug: "outros",
    titulo: "Outros",
    descricao: "Demais modelos e formulários (carteira de trabalho náutico etc.).",
    icon: FileText,
    categorias: ["Carteira de Trabalho Náutico"],
  },
];

/** Slugs antigos (por setor) → página inicial de documentos (áreas por serviço). */
export const SLUGS_ANTIGOS_DOCUMENTO = ["escola-nautica", "esporte-recreio", "comerciais", "obras-nauticas"];

/** Categorias cobertas pelos módulos fixos (exclui "Outros" para não se cobrir). */
export function categoriasCobertas(excluirOutros = false): string[] {
  return MODULOS_DOCUMENTO.filter((m) => (excluirOutros ? m.slug !== "outros" : true)).flatMap((m) => m.categorias);
}

export function moduloPorSlug(slug: string): ModuloDocumento | undefined {
  return MODULOS_DOCUMENTO.find((m) => m.slug === slug);
}
