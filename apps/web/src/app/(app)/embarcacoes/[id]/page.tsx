import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { embarcacoes, motores, aquisicoes, salvatagemItens, clientes, embarcacaoFotos } from "@/db/schema";
import { Trash2 } from "lucide-react";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { StatusBadge, Button, Badge, LinkButton, BackButton, ConfirmButton } from "@/components/ui";
import { CadastradoPor } from "@/components/ui/cadastrado-por";
import { urgenciaVencimento, infoUrgencia } from "@/lib/status";
import { adicionarItemSalvatagem } from "./actions";
import { excluirEmbarcacao, enviarFotoEmbarcacao, removerFotoEmbarcacao } from "../actions";

export default async function EmbarcacaoDetalhesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [embarcacao] = await db.select().from(embarcacoes).where(eq(embarcacoes.id, id)).limit(1);
  if (!embarcacao) notFound();

  const [proprietario] = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .where(eq(clientes.id, embarcacao.clienteId))
    .limit(1);

  const motoresDaEmbarcacao = await db
    .select()
    .from(motores)
    .where(eq(motores.embarcacaoId, id))
    .orderBy(motores.ordem);

  const aquisicoesDaEmbarcacao = await db
    .select()
    .from(aquisicoes)
    .where(eq(aquisicoes.embarcacaoId, id));

  const salvatagemDaEmbarcacao = await db
    .select()
    .from(salvatagemItens)
    .where(eq(salvatagemItens.embarcacaoId, id));

  const fotosDaEmbarcacao = await db
    .select()
    .from(embarcacaoFotos)
    .where(eq(embarcacaoFotos.embarcacaoId, id));

  const adicionarItemComId = adicionarItemSalvatagem.bind(null, id);
  const excluirComId = excluirEmbarcacao.bind(null, id);
  const enviarFotoComId = enviarFotoEmbarcacao.bind(null, id);
  const removerFotoComId = removerFotoEmbarcacao.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/embarcacoes" />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-headline-lg font-bold text-primary">{embarcacao.nome}</h1>
            <Badge tone={embarcacao.classe === "comercial" ? "warning" : "info"} size="sm">
              {embarcacao.classe === "comercial" ? "Comercial" : "Esporte e Recreio"}
            </Badge>
          </div>
          <p className="text-body-sm text-outline">
            Proprietário:{" "}
            <Link href={`/clientes/${proprietario.id}`} className="hover:underline">
              {proprietario.nome}
            </Link>
          </p>
          <CadastradoPor usuarioId={embarcacao.criadoPorId} />
        </div>
        <div className="flex gap-2">
          <LinkButton href={`/embarcacoes/${id}/editar`} variant="outlined">
            Editar
          </LinkButton>
          <form action={excluirComId}>
            <ConfirmButton
              mensagem={`Excluir a embarcação ${embarcacao.nome}?`}
              icon={<Trash2 size={14} />}
            >
              Excluir
            </ConfirmButton>
          </form>
        </div>
      </div>

      <SectionCard title="Dados Técnicos">
        <dl className="grid grid-cols-2 gap-4 text-body-md sm:grid-cols-4">
          {[
            ["Tipo", embarcacao.tipo],
            ["Inscrição", embarcacao.numeroInscricao],
            ["Comprimento", embarcacao.comprimento],
            ["Boca", embarcacao.boca],
            ["Casco Nº", embarcacao.numeroCasco],
            ["Material Casco", embarcacao.materialCasco],
            ["Ano", embarcacao.ano],
            ["Lotação", embarcacao.lotacao],
          ].map(([label, value]) => (
            <div key={label as string}>
              <dt className="font-mono-caps text-label-sm uppercase text-outline">{label}</dt>
              <dd className="text-primary">{value ?? "—"}</dd>
            </div>
          ))}
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Validade DPEM</dt>
            <dd className="flex items-center gap-2 text-primary">
              {embarcacao.validadeDpem ?? "—"}
              {embarcacao.validadeDpem && (
                <StatusBadge status={infoUrgencia(urgenciaVencimento(embarcacao.validadeDpem))} size="sm" />
              )}
            </dd>
          </div>
          {embarcacao.classe === "comercial" && (
            <div>
              <dt className="font-mono-caps text-label-sm uppercase text-outline">Atividade Específica</dt>
              <dd className="text-primary">{embarcacao.atividadeComercial ?? "—"}</dd>
            </div>
          )}
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Marca do Motor</dt>
            <dd className="text-primary">{embarcacao.tipoPropulsao ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Potência (HP)</dt>
            <dd className="text-primary">{embarcacao.potenciaMotor ?? "—"}</dd>
          </div>
          <div>
            <dt className="font-mono-caps text-label-sm uppercase text-outline">Nº Série do Motor</dt>
            <dd className="text-primary">{embarcacao.numeroSerieMotor ?? "—"}</dd>
          </div>
        </dl>
      </SectionCard>

      {motoresDaEmbarcacao.length > 0 && (
        <SectionCard title="Motores">
          <table className="w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                <th className="px-2 py-2">#</th>
                <th className="px-2 py-2">Marca</th>
                <th className="px-2 py-2">Potência</th>
                <th className="px-2 py-2">Nº Série</th>
              </tr>
            </thead>
            <tbody>
              {motoresDaEmbarcacao.map((m) => (
                <tr key={m.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-2 py-2">{m.ordem}</td>
                  <td className="px-2 py-2">{m.marca ?? "—"}</td>
                  <td className="px-2 py-2">{m.potencia ?? "—"}</td>
                  <td className="px-2 py-2">{m.numeroSerie ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      )}

      {aquisicoesDaEmbarcacao.length > 0 && (
        <SectionCard title="Aquisição">
          {aquisicoesDaEmbarcacao.map((a) => (
            <dl key={a.id} className="grid grid-cols-2 gap-4 text-body-md sm:grid-cols-4">
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">NF</dt>
                <dd className="text-primary">{a.numeroNf ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">Data</dt>
                <dd className="text-primary">{a.dataVenda ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">Vendedor</dt>
                <dd className="text-primary">{a.vendedor ?? "—"}</dd>
              </div>
              <div>
                <dt className="font-mono-caps text-label-sm uppercase text-outline">Valor</dt>
                <dd className="text-primary">{a.valor ?? "—"}</dd>
              </div>
            </dl>
          ))}
        </SectionCard>
      )}

      <SectionCard title="Controle de Salvatagem">
        {salvatagemDaEmbarcacao.length > 0 && (
          <table className="mb-4 w-full text-left text-body-md">
            <thead>
              <tr className="border-b border-outline-variant font-mono-caps text-label-sm uppercase tracking-wide text-outline">
                <th className="px-2 py-2">Item</th>
                <th className="px-2 py-2">Quantidade</th>
                <th className="px-2 py-2">Validade</th>
              </tr>
            </thead>
            <tbody>
              {salvatagemDaEmbarcacao.map((s) => (
                <tr key={s.id} className="border-b border-outline-variant last:border-0">
                  <td className="px-2 py-2">{s.item}</td>
                  <td className="px-2 py-2">{s.quantidade}</td>
                  <td className="px-2 py-2">
                    <div className="flex items-center gap-2">
                      {s.validade ?? "—"}
                      {s.validade && (
                        <StatusBadge status={infoUrgencia(urgenciaVencimento(s.validade))} size="sm" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <form action={adicionarItemComId} className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Campo label="Item" name="item" required />
          <Campo label="Quantidade" name="quantidade" type="number" defaultValue={1} />
          <Campo label="Validade" name="validade" type="date" />
          <div className="flex items-end">
            <Button type="submit">Adicionar Item</Button>
          </div>
        </form>
      </SectionCard>

      <SectionCard title={`Fotos da Embarcação (${fotosDaEmbarcacao.length})`}>
        <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {fotosDaEmbarcacao.map((foto) => (
            <div key={foto.id} className="space-y-2">
              <div className="relative aspect-square overflow-hidden rounded-lg border border-outline-variant">
                <Image
                  src={`/api/embarcacao-fotos/${foto.id}`}
                  alt="Foto da embarcação"
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
