import { eq, and, or } from "drizzle-orm";
import { db } from "@/db";
import {
  clientes,
  embarcacoes,
  motores,
  aquisicoes,
  habilitacoes,
  obras,
  modelosDocumento,
  engenheiros,
  processos,
} from "@/db/schema";
import { CampoSelect, SectionCard } from "@/components/ui/form-field";
import { Button, LinkButton, BackButton } from "@/components/ui";
import { resolverCamposConhecidos } from "@/lib/docx/resolver";
import { GerarDocumentoForm } from "./form";

export default async function GerarDocumentoPage({
  searchParams,
}: {
  searchParams: Promise<{
    clienteId?: string;
    embarcacaoId?: string;
    obraId?: string;
    modeloId?: string;
    processoId?: string;
  }>;
}) {
  const { clienteId, embarcacaoId, obraId, processoId } = await searchParams;
  let { modeloId } = await searchParams;

  const listaModelos = await db
    .select({
      id: modelosDocumento.id,
      nome: modelosDocumento.nome,
      categoria: modelosDocumento.categoria,
      padraoParaObra: modelosDocumento.padraoParaObra,
    })
    .from(modelosDocumento)
    .where(
      and(
        eq(modelosDocumento.ativo, true),
        // Ao gerar a partir de uma obra, só faz sentido oferecer os documentos dela.
        obraId
          ? or(
              eq(modelosDocumento.categoria, "Obras (NORMAM-303)"),
              eq(modelosDocumento.padraoParaObra, true)
            )
          : undefined
      )
    )
    .orderBy(modelosDocumento.nome);

  if (!modeloId && obraId) {
    modeloId = listaModelos.find((m) => m.padraoParaObra)?.id ?? listaModelos[0]?.id;
  }

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  const embarcacoesDoCliente = clienteId
    ? await db.select().from(embarcacoes).where(eq(embarcacoes.clienteId, clienteId))
    : [];

  const obrasDoCliente = clienteId
    ? await db.select().from(obras).where(eq(obras.clienteId, clienteId))
    : [];

  let camposResolvidos: Record<string, string> = {};
  let modeloSelecionado: typeof modelosDocumento.$inferSelect | null = null;

  if (modeloId) {
    const [modelo] = await db
      .select()
      .from(modelosDocumento)
      .where(eq(modelosDocumento.id, modeloId))
      .limit(1);
    modeloSelecionado = modelo ?? null;

    const [cliente] = clienteId
      ? await db.select().from(clientes).where(eq(clientes.id, clienteId)).limit(1)
      : [];
    const [embarcacao] = embarcacaoId
      ? await db.select().from(embarcacoes).where(eq(embarcacoes.id, embarcacaoId)).limit(1)
      : [];
    const motoresDaEmbarcacao = embarcacaoId
      ? await db.select().from(motores).where(eq(motores.embarcacaoId, embarcacaoId)).orderBy(motores.ordem)
      : [];
    const [aquisicao] = embarcacaoId
      ? await db.select().from(aquisicoes).where(eq(aquisicoes.embarcacaoId, embarcacaoId)).limit(1)
      : [];
    const habilitacoesDoCliente = clienteId
      ? await db.select().from(habilitacoes).where(eq(habilitacoes.clienteId, clienteId))
      : [];
    const [obra] = obraId ? await db.select().from(obras).where(eq(obras.id, obraId)).limit(1) : [];
    const [engenheiro] =
      obra?.engenheiroId
        ? await db.select().from(engenheiros).where(eq(engenheiros.id, obra.engenheiroId)).limit(1)
        : [];
    const [processo] = processoId
      ? await db.select({ servicoId: processos.servicoId }).from(processos).where(eq(processos.id, processoId)).limit(1)
      : [];
    const servicoId = processo?.servicoId ?? modelo?.servicoId ?? null;

    camposResolvidos = resolverCamposConhecidos({
      cliente,
      embarcacao,
      motores: motoresDaEmbarcacao,
      aquisicao,
      habilitacoes: habilitacoesDoCliente,
      obra,
      engenheiro,
      camposMarcacao: modelo?.camposMarcacao,
      servicoId,
    });
  }

  return (
    <div className="space-y-gutter">
      <BackButton href="/documentos" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Gerar Documento</h1>

      <SectionCard title="1. Cliente, Embarcação/Obra e Modelo">
        <form method="get" className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          {processoId && <input type="hidden" name="processoId" value={processoId} />}
          <CampoSelect
            label="Cliente"
            name="clienteId"
            defaultValue={clienteId ?? ""}
            options={[
              { value: "", label: "Selecione..." },
              ...listaClientes.map((c) => ({ value: c.id, label: c.nome })),
            ]}
          />
          <CampoSelect
            label="Embarcação (opcional)"
            name="embarcacaoId"
            defaultValue={embarcacaoId ?? ""}
            options={[
              { value: "", label: "Nenhuma" },
              ...embarcacoesDoCliente.map((e) => ({ value: e.id, label: e.nome })),
            ]}
          />
          <CampoSelect
            label="Obra (opcional)"
            name="obraId"
            defaultValue={obraId ?? ""}
            options={[
              { value: "", label: "Nenhuma" },
              ...obrasDoCliente.map((o) => ({ value: o.id, label: o.titulo ?? "(sem título)" })),
            ]}
          />
          <CampoSelect
            label="Modelo"
            name="modeloId"
            defaultValue={modeloId ?? ""}
            options={[
              { value: "", label: "Selecione..." },
              ...listaModelos.map((m) => ({ value: m.id, label: m.nome })),
            ]}
          />
          <div className="sm:col-span-4">
            <Button type="submit" variant="outlined">
              Carregar Campos
            </Button>
          </div>
        </form>
      </SectionCard>

      {obraId && (
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4">
          <p className="font-mono-caps text-label-sm uppercase tracking-wide text-outline">
            Documentos desta obra (NORMAM-303)
          </p>
          <p className="mt-1 text-body-sm text-outline">
            São apenas estes dois. Gere um, confira, depois alterne para o outro no seletor acima —
            os dados da obra são os mesmos.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {listaModelos.map((m) => {
              const params = new URLSearchParams();
              if (clienteId) params.set("clienteId", clienteId);
              if (obraId) params.set("obraId", obraId);
              if (processoId) params.set("processoId", processoId);
              params.set("modeloId", m.id);
              return (
                <LinkButton
                  key={m.id}
                  href={`/documentos/gerar?${params.toString()}`}
                  variant={m.id === modeloId ? "filled" : "outlined"}
                  size="sm"
                >
                  {m.nome}
                </LinkButton>
              );
            })}
          </div>
        </div>
      )}

      {modeloSelecionado && (
        <GerarDocumentoForm
          modeloId={modeloSelecionado.id}
          modeloNome={modeloSelecionado.nome}
          clienteId={clienteId ?? ""}
          embarcacaoId={embarcacaoId ?? ""}
          obraId={obraId}
          processoId={processoId}
          campos={modeloSelecionado.campos}
          camposResolvidos={camposResolvidos}
        />
      )}
    </div>
  );
}
