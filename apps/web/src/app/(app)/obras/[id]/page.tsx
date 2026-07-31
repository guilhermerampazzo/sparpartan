import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { obras, clientes, engenheiros, obraFotos } from "@/db/schema";
import { SectionCard } from "@/components/ui/form-field";
import { BackButton, LinkButton, Button } from "@/components/ui";
import { CadastradoPor } from "@/components/ui/cadastrado-por";
import { enviarFotoObra, removerFotoObra } from "../actions";

function Campo({ label, valor }: { label: string; valor: string | number | null }) {
  return (
    <div>
      <dt className="font-mono-caps text-[11px] uppercase text-outline">{label}</dt>
      <dd className="text-primary">{valor ?? "—"}</dd>
    </div>
  );
}

export default async function ObraDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [obra] = await db.select().from(obras).where(eq(obras.id, id)).limit(1);
  if (!obra) notFound();

  const [cliente] = await db.select().from(clientes).where(eq(clientes.id, obra.clienteId)).limit(1);

  const [engenheiro] = obra.engenheiroId
    ? await db.select().from(engenheiros).where(eq(engenheiros.id, obra.engenheiroId)).limit(1)
    : [];

  const fotos = await db.select().from(obraFotos).where(eq(obraFotos.obraId, id));
  const enviarFotoComId = enviarFotoObra.bind(null, id);
  const removerFotoComId = removerFotoObra.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/obras" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">
            {obra.titulo ?? "(sem título)"}
          </h1>
          <p className="text-sm text-outline">
            Proprietário:{" "}
            <Link href={`/clientes/${cliente?.id}`} className="hover:underline">
              {cliente?.nome}
            </Link>
          </p>
          <CadastradoPor usuarioId={obra.criadoPorId} />
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/obras/${id}/editar`} variant="outlined">
            Editar
          </LinkButton>
          <Link
            href={`/documentos/gerar?clienteId=${obra.clienteId}&obraId=${obra.id}`}
            className="rounded-lg bg-primary px-4 py-2 font-display text-sm font-semibold text-on-primary hover:opacity-90"
          >
            Gerar Documento
          </Link>
        </div>
      </div>

      <SectionCard title="Identificação">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Campo label="ID da Obra" valor={obra.idObra} />
          <Campo label="Tipo" valor={obra.tipoObra} />
          <Campo label="Código do Item" valor={obra.itemObraCodigo} />
          <Campo label="NORMAM de Uso" valor={obra.normamDeUso} />
          <Campo label="CP/DL/AG" valor={obra.cpDlAg} />
          <Campo label="Endereço" valor={obra.endereco} />
        </dl>
      </SectionCard>

      <SectionCard title="Responsável Técnico">
        {engenheiro ? (
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
            <Campo label="Nome Completo" valor={engenheiro.nomeCompleto} />
            <Campo label="CPF" valor={engenheiro.cpf} />
            <Campo label="CREA" valor={engenheiro.crea} />
            <Campo label="Título Profissional" valor={engenheiro.tituloProfissional} />
          </dl>
        ) : (
          <p className="text-sm text-outline">
            Nenhum engenheiro responsável vinculado.{" "}
            {(obra.respTecnico || obra.nCrea) && (
              <>
                (Legado: {obra.respTecnico ?? "—"} {obra.nCrea ? `— CREA ${obra.nCrea}` : ""})
              </>
            )}
          </p>
        )}
      </SectionCard>

      <SectionCard title="Localização">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Campo label="Rio" valor={obra.rioLocalizado} />
          <Campo label="Distância (km)" valor={obra.distanciaRioKm} />
          <Campo label="Área de Navegação" valor={obra.areaNavegacao} />
          <Campo label="Atividade" valor={obra.atividade} />
          <Campo label="Ponto A" valor={obra.pontoA} />
          <Campo label="Ponto B" valor={obra.pontoB} />
          <Campo label="Ponto C" valor={obra.pontoC} />
          <Campo label="Ponto D" valor={obra.pontoD} />
        </dl>
      </SectionCard>

      <SectionCard title="Dimensões e Estrutura">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Campo label="Comprimento" valor={obra.comprimento} />
          <Campo label="Largura" valor={obra.largura} />
          <Campo label="Área Construída" valor={obra.areaConstruida} />
          <Campo label="Apoiado Sobre" valor={obra.apoiadoSobre} />
          <Campo label="Material Estrutura" valor={obra.matEstrutura} />
          <Campo label="Material Paredes" valor={obra.matParedes} />
          <Campo label="Material Piso" valor={obra.matPiso} />
          <Campo label="Material Cobertura" valor={obra.matCobertura} />
          <Campo label="Banheiro" valor={obra.banheiroSn} />
        </dl>
      </SectionCard>

      <SectionCard title="Calados e Salvatagem">
        <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
          <Campo label="Calado Carregado" valor={obra.caladoCar} />
          <Campo label="Calado Leve" valor={obra.caladoLeve} />
          <Campo label="Lotação Máxima" valor={obra.lotacaoMax} />
          <Campo label="Coletes" valor={obra.coletes} />
          <Campo label="Boias" valor={obra.boias} />
        </dl>
      </SectionCard>

      <SectionCard title={`Fotos da Obra (${fotos.length})`}>
        {fotos.length < 3 && (
          <p className="mb-4 text-sm text-warning">
            O memorial descritivo recomenda no mínimo 3 fotos — faltam {3 - fotos.length}.
          </p>
        )}
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fotos.map((foto) => (
            <div key={foto.id} className="space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-outline-variant">
                <Image
                  src={`/api/obra-fotos/${foto.id}`}
                  alt="Foto da obra"
                  fill
                  className="object-cover"
                />
              </div>
              <form action={removerFotoComId.bind(null, foto.id)}>
                <Button type="submit" variant="outlined" size="sm">
                  Remover
                </Button>
              </form>
            </div>
          ))}
        </div>
        <form action={enviarFotoComId} className="flex items-end gap-3">
          <input
            name="foto"
            type="file"
            accept="image/*"
            required
            className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-body-md text-primary outline-none focus:border-primary"
          />
          <Button type="submit" variant="outlined" size="sm">
            Enviar Foto
          </Button>
        </form>
      </SectionCard>
    </div>
  );
}
