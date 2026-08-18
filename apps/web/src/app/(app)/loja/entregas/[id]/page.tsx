import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { clientes, lojaEntregaDocumentos, lojaEntregas, lojaVendas } from "@/db/schema";
import { BackButton, Badge, CampoSelect, EmptyState, SectionCard, SubmitButton } from "@/components/ui";
import { dataIsoParaBR } from "@/lib/datas";
import { formatarMoeda, infoStatusEntrega } from "@/lib/loja";
import { adicionarDocumentoEntrega, avancarStatusEntrega } from "../../vendas/actions";

const TIPOS_DOCUMENTO = [
  { value: "comprovante", label: "Comprovante" },
  { value: "foto_entrega", label: "Foto da entrega" },
  { value: "documento", label: "Documento" },
  { value: "recibo", label: "Recibo" },
];

export default async function EntregaDetalhesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [entrega] = await db
    .select({
      id: lojaEntregas.id,
      vendaId: lojaEntregas.vendaId,
      endereco: lojaEntregas.endereco,
      cidade: lojaEntregas.cidade,
      transportadora: lojaEntregas.transportadora,
      responsavel: lojaEntregas.responsavel,
      dataPrevista: lojaEntregas.dataPrevista,
      dataRealizada: lojaEntregas.dataRealizada,
      frete: lojaEntregas.frete,
      pedagio: lojaEntregas.pedagio,
      outrosCustos: lojaEntregas.outrosCustos,
      observacoes: lojaEntregas.observacoes,
      status: lojaEntregas.status,
      clienteNome: clientes.nome,
    })
    .from(lojaEntregas)
    .innerJoin(lojaVendas, eq(lojaEntregas.vendaId, lojaVendas.id))
    .innerJoin(clientes, eq(lojaVendas.clienteId, clientes.id))
    .where(eq(lojaEntregas.id, id))
    .limit(1);

  if (!entrega) notFound();

  const documentos = await db
    .select()
    .from(lojaEntregaDocumentos)
    .where(eq(lojaEntregaDocumentos.entregaId, id));
  const status = infoStatusEntrega(entrega.status);
  const totalCustos = Number(entrega.frete) + Number(entrega.pedagio) + Number(entrega.outrosCustos);
  const avancar = avancarStatusEntrega.bind(null, id);
  const anexar = adicionarDocumentoEntrega.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja/entregas" />
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Entrega</h1>
        <Badge tone={status.tone}>{status.label}</Badge>
      </div>
      <p className="text-body-sm text-outline">Cliente: {entrega.clienteNome}</p>

      <SectionCard title="Dados da entrega">
        <dl className="grid grid-cols-1 gap-4 text-body-md sm:grid-cols-2 lg:grid-cols-3">
          <div><dt className="font-mono-caps text-label-sm uppercase text-outline">Endereço</dt><dd>{entrega.endereco ?? "—"}</dd></div>
          <div><dt className="font-mono-caps text-label-sm uppercase text-outline">Cidade</dt><dd>{entrega.cidade ?? "—"}</dd></div>
          <div><dt className="font-mono-caps text-label-sm uppercase text-outline">Transportadora</dt><dd>{entrega.transportadora ?? "—"}</dd></div>
          <div><dt className="font-mono-caps text-label-sm uppercase text-outline">Responsável</dt><dd>{entrega.responsavel ?? "—"}</dd></div>
          <div><dt className="font-mono-caps text-label-sm uppercase text-outline">Data prevista</dt><dd>{dataIsoParaBR(entrega.dataPrevista)}</dd></div>
          <div><dt className="font-mono-caps text-label-sm uppercase text-outline">Data realizada</dt><dd>{dataIsoParaBR(entrega.dataRealizada)}</dd></div>
          <div><dt className="font-mono-caps text-label-sm uppercase text-outline">Frete</dt><dd>{formatarMoeda(entrega.frete)}</dd></div>
          <div><dt className="font-mono-caps text-label-sm uppercase text-outline">Pedágio</dt><dd>{formatarMoeda(entrega.pedagio)}</dd></div>
          <div><dt className="font-mono-caps text-label-sm uppercase text-outline">Outros custos</dt><dd>{formatarMoeda(entrega.outrosCustos)}</dd></div>
          <div><dt className="font-mono-caps text-label-sm uppercase text-outline">Total</dt><dd className="font-semibold">{formatarMoeda(totalCustos)}</dd></div>
          <div className="sm:col-span-2"><dt className="font-mono-caps text-label-sm uppercase text-outline">Observações</dt><dd>{entrega.observacoes ?? "—"}</dd></div>
        </dl>
      </SectionCard>

      <SectionCard title="Status">
        <form action={avancar}>
          <SubmitButton variant="tonal" size="sm">Avançar status →</SubmitButton>
        </form>
      </SectionCard>

      <SectionCard title="Documentos e comprovantes">
        {documentos.length === 0 ? (
          <EmptyState title="Nenhum documento anexado" description="Anexe um comprovante ou documento da entrega." />
        ) : (
          <ul className="mb-4 divide-y divide-outline-variant">
            {documentos.map((documento) => (
              <li key={documento.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="text-body-sm text-primary">{documento.nomeOriginal}</span>
                <span className="flex items-center gap-2">
                  <Badge tone="info" size="sm">{TIPOS_DOCUMENTO.find((tipo) => tipo.value === documento.tipo)?.label ?? documento.tipo}</Badge>
                  <a href={`/api/loja-entregas/${documento.id}`} target="_blank" rel="noreferrer" className="text-body-sm text-primary hover:underline">Abrir</a>
                </span>
              </li>
            ))}
          </ul>
        )}
        <form action={anexar} className="flex flex-wrap items-end gap-3">
          <CampoSelect label="Tipo" name="tipo" defaultValue="comprovante" options={TIPOS_DOCUMENTO} />
          <input name="arquivo" type="file" required className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary" />
          <SubmitButton variant="outlined" size="sm">Anexar</SubmitButton>
        </form>
      </SectionCard>
    </div>
  );
}
