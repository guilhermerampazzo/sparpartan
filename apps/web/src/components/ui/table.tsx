import Link from "next/link";

export interface Column<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  align?: "left" | "right";
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  empty,
  rowHref,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  empty: React.ReactNode;
  rowHref?: (row: T) => string;
}) {
  if (rows.length === 0) {
    return (
      <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
        {empty}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-outline-variant bg-surface-container-lowest">
      <table className="w-full min-w-[640px] text-left text-body-md">
        <thead>
          <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase text-outline">
            {columns.map((col) => (
              <th
                key={col.header}
                className={`px-4 py-3 ${col.align === "right" ? "text-right" : "text-left"}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = rowHref?.(row);
            return (
              <tr
                key={rowKey(row)}
                className={`relative border-b border-outline-variant last:border-0 hover:bg-surface ${
                  href ? "cursor-pointer" : ""
                }`}
              >
                {columns.map((col, i) => (
                  <td
                    key={col.header}
                    className={`px-4 py-3 ${
                      col.align === "right" ? "text-right" : "text-left"
                    } ${col.className ?? ""} ${
                      // A última coluna (ações) fica acima do link de linha
                      // inteira — os controles dela continuam clicáveis.
                      href && i === columns.length - 1 ? "relative z-10" : ""
                    }`}
                  >
                    {href && col === columns[0] ? (
                      // O primeiro link "estica" sobre a linha toda via ::after —
                      // clicar em qualquer célula abre o registro, sem event
                      // handler (que Server Components não podem passar).
                      <Link
                        href={href}
                        className="after:absolute after:inset-0 hover:underline"
                      >
                        {col.cell(row)}
                      </Link>
                    ) : (
                      col.cell(row)
                    )}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
