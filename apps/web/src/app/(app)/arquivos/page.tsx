import { desc, eq, or, ilike } from "drizzle-orm";
import { Folder, Download } from "lucide-react";
import { db } from "@/db";
import { arquivos, clientes, processos, servicos } from "@/db/schema";
import { Badge, LinkButton, EmptyState, DataTable, SearchBox, type Column } from "@/components/ui";

type LinhaArquivo = {
  id: string;
  tipo: string;
  nomeOriginal: string;
  clienteNome: string;
  clienteId: string;
  servicoNome: string | null;
  criadoEm: Date;
};

export default async function ArquivosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const filtro = q
    ? or(ilike(arquivos.nomeOriginal, `%${q}%`), ilike(arquivos.textoExtraido, `%${q}%`))
    : undefined;

  const lista = await db
    .select({
      id: arquivos.id,
      tipo: arquivos.tipo,
      nomeOriginal: arquivos.nomeOriginal,
      clienteNome: clientes.nome,
      clienteId: clientes.id,
      servicoNome: servicos.nome,
      criadoEm: arquivos.criadoEm,
    })
    .from(arquivos)
    .innerJoin(clientes, eq(arquivos.clienteId, clientes.id))
    .leftJoin(processos, eq(arquivos.processoId, processos.id))
    .leftJoin(servicos, eq(processos.servicoId, servicos.id))
    .where(filtro)
    .orderBy(desc(arquivos.criadoEm));

  const columns: Column<LinhaArquivo>[] = [
    { header: "Arquivo", cell: (a) => <span className="font-medium text-primary">{a.nomeOriginal}</span> },
    { header: "Tipo", cell: (a) => <Badge tone="neutral" size="sm">{a.tipo}</Badge> },
    {
      header: "Cliente",
      cell: (a) => (
        <a href={`/clientes/${a.clienteId}`} className="text-primary hover:underline">
          {a.clienteNome}
        </a>
      ),
    },
    { header: "Processo", cell: (a) => a.servicoNome ?? "—" },
    { header: "Enviado em", cell: (a) => new Date(a.criadoEm).toLocaleDateString("pt-BR") },
    {
      header: "",
      align: "right",
      cell: (a) => (
        <LinkButton href={`/api/arquivos/${a.id}`} variant="text" size="sm" icon={Download}>
          Baixar
        </LinkButton>
      ),
    },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">Arquivos</h1>
          <p className="text-body-sm text-outline">
            Todos os documentos enviados por clientes — direto ou pelos links de autoatendimento.
          </p>
        </div>
        <SearchBox placeholder="Buscar por nome ou texto do documento..." valorAtual={q} />
      </div>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(a) => a.id}
        empty={
          <EmptyState
            icon={Folder}
            title={q ? "Nenhum arquivo encontrado" : "Nenhum arquivo enviado ainda"}
          />
        }
      />
    </div>
  );
}
