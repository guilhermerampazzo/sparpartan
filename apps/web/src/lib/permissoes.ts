import { NAV_ITEMS } from "@/lib/nav-items";

const SEMPRE_LIBERADOS = ["/", "/configuracoes", "/chat"];

function correspondeHref(pathname: string, href: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Módulos que podem ser marcados/desmarcados na tela de permissões (exclui os sempre liberados). */
export function opcoesDeModulos(): { href: string; label: string }[] {
  const opcoes: { href: string; label: string }[] = [];
  for (const item of NAV_ITEMS) {
    if (!SEMPRE_LIBERADOS.includes(item.href)) opcoes.push({ href: item.href, label: item.label });
    for (const filho of item.children ?? []) {
      if (!SEMPRE_LIBERADOS.includes(filho.href)) opcoes.push({ href: filho.href, label: filho.label });
    }
  }
  return opcoes;
}

/** `modulosPermitidos` null = acesso liberado a tudo (comportamento padrão/admin). */
export function moduloLiberado(pathname: string, modulosPermitidos: string[] | null | undefined): boolean {
  if (!modulosPermitidos) return true;
  if (SEMPRE_LIBERADOS.some((href) => correspondeHref(pathname, href))) return true;
  return NAV_ITEMS.some((item) => {
    const filhos = item.children ?? [];
    // Página principal (ex.: /escola) fica liberada quando qualquer subpágina dela está liberada.
    if (correspondeHref(pathname, item.href)) {
      return (
        modulosPermitidos.includes(item.href) ||
        filhos.some((filho) => modulosPermitidos.includes(filho.href))
      );
    }
    return filhos.some(
      (filho) => correspondeHref(pathname, filho.href) && modulosPermitidos.includes(filho.href)
    );
  });
}

export function itemNavLiberado(href: string, modulosPermitidos: string[] | null | undefined): boolean {
  if (!modulosPermitidos) return true;
  if (SEMPRE_LIBERADOS.includes(href)) return true;
  return modulosPermitidos.includes(href);
}
