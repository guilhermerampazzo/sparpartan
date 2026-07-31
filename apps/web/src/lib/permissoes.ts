import { NAV_ITEMS, type NavItem } from "@/lib/nav-items";

const SEMPRE_LIBERADOS = ["/", "/configuracoes", "/chat"];

function todosHrefsModulo(items: NavItem[]): string[] {
  return items.flatMap((item) => [item.href, ...(item.children?.map((filho) => filho.href) ?? [])]);
}

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
  return todosHrefsModulo(NAV_ITEMS).some(
    (href) => correspondeHref(pathname, href) && modulosPermitidos.includes(href)
  );
}

export function itemNavLiberado(href: string, modulosPermitidos: string[] | null | undefined): boolean {
  if (!modulosPermitidos) return true;
  if (SEMPRE_LIBERADOS.includes(href)) return true;
  return modulosPermitidos.includes(href);
}
