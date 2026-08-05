import { readFile } from "node:fs/promises";
import path from "node:path";
import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { Download, FileDown, AlertCircle } from "lucide-react";
import { PDFDocument } from "pdf-lib";
import { db } from "@/db";
import { documentosGerados, modelosDocumento, clientes, assinaturas } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { LinkButton, Button, StatusBadge, BackButton } from "@/components/ui";
import { statusAssinatura } from "@/lib/status";
import { solicitarAssinatura } from "./actions";
import { regenerarPdf } from "../actions";

export default async function DocumentoDetalhesPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ erro?: string }>;
}) {
  const { id } = await params;
  const { erro } = await searchParams;

  const [documento] = await db
    .select()
    .from(documentosGerados)
    .where(eq(documentosGerados.id, id))
    .limit(1);
  if (!documento) notFound();

  const [modelo] = await db
    .select()
    .from(modelosDocumento)
    .where(eq(modelosDocumento.id, documento.modeloId))
    .limit(1);
  const [cliente] = await db
    .select()
    .from(clientes)
    .where(eq(clientes.id, documento.clienteId))
    .limit(1);

  const [assinatura] = await db
    .select()
    .from(assinaturas)
    .where(eq(assinaturas.documentoId, id))
    .orderBy(desc(assinaturas.criadoEm))
    .limit(1);

  const solicitarAssinaturaComId = solicitarAssinatura.bind(null, id);
  const regenerarPdfComId = regenerarPdf.bind(null, id);

  let totalPaginas = 0;
  if (documento.pdfCaminho) {
    try {
      const uploadsDir = process.env.UPLOADS_DIR ?? "./data/uploads";
      const bytes = await readFile(path.join(uploadsDir, documento.pdfCaminho));
      const pdf = await PDFDocument.load(bytes);
      totalPaginas = pdf.getPageCount();
    } catch {
      totalPaginas = 0;
    }
  }

  return (
    <div className="space-y-gutter">
      <BackButton href={documento.processoId ? `/processos/${documento.processoId}` : "/documentos"} />
      <h1 className="font-display text-headline-lg font-bold text-primary">
        {modelo?.nome} — {cliente?.nome}
      </h1>

      {erro && (
        <div className="flex items-center gap-2 rounded-lg bg-error-container p-3 text-body-sm text-on-error-container">
          <AlertCircle size={16} /> {erro}
        </div>
      )}

      <SectionCard title="Documento Gerado">
        <div className="flex flex-wrap items-center gap-3">
          <LinkButton href={`/api/documentos/${documento.id}?tipo=docx`} icon={Download}>
            Baixar DOCX
          </LinkButton>
          {documento.pdfCaminho ? (
            <LinkButton href={`/api/documentos/${documento.id}?tipo=pdf`} variant="outlined" icon={Download}>
              Baixar PDF
            </LinkButton>
          ) : (
            <div className="flex flex-wrap items-center gap-3">
              <form action={regenerarPdfComId}>
                <Button type="submit" variant="tonal" icon={FileDown}>
                  Gerar PDF
                </Button>
              </form>
              <p className="text-body-sm text-outline">
                PDF ainda não foi gerado (o Gotenberg pode ter caído) — o DOCX continua utilizável.
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {documento.pdfCaminho && totalPaginas > 1 && (
        <SectionCard title="Baixar Página por Página">
          <p className="mb-3 text-body-sm text-outline">
            Útil quando só uma folha do documento (ex.: um termo específico) precisa ser assinada
            separadamente.
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <LinkButton
              href={`/api/documentos/${documento.id}?tipo=pdf&formato=zip`}
              variant="outlined"
              icon={Download}
            >
              Baixar todas as páginas separadas (.zip)
            </LinkButton>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((n) => (
              <LinkButton
                key={n}
                href={`/api/documentos/${documento.id}?tipo=pdf&pagina=${n}`}
                variant="text"
                size="sm"
              >
                Página {n}
              </LinkButton>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Assinatura Digital">
        {!assinatura && (
          <form action={solicitarAssinaturaComId}>
            <Button type="submit">Solicitar Assinatura ao Cliente</Button>
          </form>
        )}
        {assinatura && assinatura.status === "pendente" && (
          <div className="space-y-2">
            <StatusBadge status={statusAssinatura(assinatura.status)} />
            <p className="break-all text-body-sm text-outline">
              Link: {process.env.AUTH_URL || "http://localhost:8080"}/assinar/{assinatura.token}
            </p>
          </div>
        )}
        {assinatura && assinatura.status === "assinado" && (
          <div className="space-y-4">
            <StatusBadge status={statusAssinatura(assinatura.status)} />
            <dl className="grid grid-cols-1 gap-4 text-body-md sm:grid-cols-3">
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">Assinado em</dt>
                <dd className="text-primary">
                  {assinatura.assinadoEm && new Date(assinatura.assinadoEm).toLocaleString("pt-BR")}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="font-mono-caps text-label-sm uppercase text-outline">Hash de Integridade</dt>
                <dd className="break-all font-mono text-body-sm text-primary">{assinatura.hash}</dd>
              </div>
            </dl>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Campos Preenchidos">
        <dl className="grid grid-cols-2 gap-4 text-body-md sm:grid-cols-3">
          {Object.entries(documento.dadosPreenchidos).map(([campo, valor]) => (
            <div key={campo}>
              <dt className="font-mono-caps text-label-sm uppercase text-outline">{campo}</dt>
              <dd className="text-primary">{valor || "—"}</dd>
            </div>
          ))}
        </dl>
      </SectionCard>
    </div>
  );
}
