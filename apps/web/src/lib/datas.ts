/** Formatação de datas no padrão brasileiro (11/08/2026). */

export function formatarDataBR(
  data: Date | string | null | undefined,
  opcoes: { comHora?: boolean; curto?: boolean } = {}
): string {
  if (!data) return "—";
  const d =
    data instanceof Date
      ? data
      : String(data).includes("T")
        ? new Date(data)
        : new Date(`${data}T00:00:00`);
  if (Number.isNaN(d.getTime())) return "—";

  const formato: Intl.DateTimeFormatOptions = opcoes.curto
    ? { day: "2-digit", month: "2-digit" }
    : { day: "2-digit", month: "2-digit", year: "numeric" };

  if (opcoes.comHora) {
    return d.toLocaleString("pt-BR", { ...formato, hour: "2-digit", minute: "2-digit" });
  }
  return d.toLocaleDateString("pt-BR", formato);
}

/** "11/08/2026 às 15:42" */
export function formatarDataHoraBR(data: Date | string | null | undefined): string {
  return formatarDataBR(data, { comHora: true });
}

/** Data ISO (yyyy-mm-dd) para exibição brasileira — para strings vindas do banco. */
export function dataIsoParaBR(iso?: string | null): string {
  if (!iso) return "—";
  return formatarDataBR(iso);
}
