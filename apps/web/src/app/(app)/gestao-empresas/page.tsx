import { and, count, eq, inArray, isNull, sql } from "drizzle-orm";
import { Building2, ShieldCheck, AlertTriangle, AlarmClock, Wrench, Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { empresas, empresaDocumentos, empresaManutencoes, empresaEmbarcacoes } from "@/db/schema";
import { StatCard, EmptyState, LinkButton, BackButton, Badge } from "@/components/ui";
import { diasAte, rotuloTipoDocumentoEmpresa } from "@/lib/empresas";
import { formatarDataBR } from "@/lib/datas";

type LinhaAtencao = {
  id: string;
  empresaId: string;
  empresaNome: string;
  documento: string;
  embarcacao: string | null;
  vencimento: string | null;
  dias: number | null;
  tipo: string;
  manutencao?: string;
};

export default async function GestaoEmpresasPage() {
  const listaEmpresas = await db
    .select({
      id: empresas.id,
      razaoSocial: empresas.razaoSocial,
      nomeFantasia: empresas.nomeFantasia,
      cnpj: empresas.cnpj,
      status: empresas.status,
    })
    .from(empresas)
    .orderBy(empresas.razaoSocial);

  const empresaIds = listaEmpresas.map((e) => e.id);

  const documentos = empresaIds.length
    ? await db
        .select({
          id: empresaDocumentos.id,
          empresaId: empresaDocumentos.empresaId,
          tipo: empresaDocumentos.tipo,
          titulo: empresaDocumentos.titulo,
          vencimento: empresaDocumentos.dataVencimento,
          embarcacaoNome: empresaEmbarcacoes.nome,
          regularizado: empresaDocumentos.regularizado,
        })
        .from(empresaDocumentos)
        .leftJoin(empresaEmbarcacoes, eq(empresaDocumentos.embarcacaoId, empresaEmbarcacoes.id))
        .where(and(inArray(empresaDocumentos.empresaId, empresaIds), eq(empresaDocumentos.regularizado, false)))
    : [];

  const manutencoes = empresaIds.length
    ? await db
        .select({
          id: empresaManutencoes.id,
          empresaId: empresaManutencoes.empresaId,
          descricao: empresaManutencoes.descricao,
          tipo: empresaManutencoes.tipo,
          embarcacaoNome: empresaEmbarcacoes.nome,
          proxima: empresaManutencoes.proximaManutencao,
          proximaOleo: empresaManutencoes.proximaTrocaOleo,
        })
        .from(empresaManutencoes)
        .leftJoin(empresaEmbarcacoes, eq(empresaManutencoes.embarcacaoId, empresaEmbarcacoes.id))
        .where(inArray(empresaManutencoes.empresaId, empresaIds))
    : [];

  const comDias = documentos.map((d) => ({ ...d, dias: diasAte(d.vencimento) }));
  const vencidos = comDias.filter((d) => d.dias !== null && d.dias < 0).sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));
  const urgentes = comDias.filter((d) => d.dias !== null && d.dias >= 0 && d.dias <= 15).sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));
  const proximos = comDias.filter((d) => d.dias !== null && d.dias > 15 && d.dias <= 35).sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));
  const emDia = comDias.filter((d) => d.dias !== null && d.dias > 35).length;
  const manutencoesProximas = manutencoes
    .map((m) => {
      const datas = [m.proxima, m.proximaOleo].filter(Boolean) as string[];
      const dias = datas.map((d) => diasAte(d)).filter((d): d is number => d !== null && d >= 0 && d <= 35);
      return { ...m, dias: dias.length ? Math.min(...dias) : null };
    })
    .filter((m) => m.dias !== null)
    .sort((a, b) => (a.dias ?? 0) - (b.dias ?? 0));

  const nomeEmpresa = (id: string) => listaEmpresas.find((e) => e.id === id)?.razaoSocial ?? "—";

  const ListaAtencao = ({ label, linhas, vazio }: { label: string; linhas: (typeof comDias)[number][]; vazio: string }) => (
    <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
      <div className="border-b border-outline-variant px-4 py-3">
        <h2 className="font-display text-title-md font-semibold text-primary">{label}</h2>
      </div>
      {linhas.length === 0 ? (
        <p className="px-4 py-4 text-body-sm text-outline">{vazio}</p>
      ) : (
        <ul className="divide-y divide-outline-variant">
          {linhas.map((d) => (
            <li key={d.id}>
              <Link
                href={`/gestao-empresas/${d.empresaId}#documentos`}
                className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-container-low"
              >
                <div className="min-w-0">
                  <p className="text-body-md text-primary">{nomeEmpresa(d.empresaId)}</p>
                  <p className="text-body-sm text-outline">
                    {rotuloTipoDocumentoEmpresa(d.tipo)}{d.titulo ? ` — ${d.titulo}` : ""}
                    {d.embarcacaoNome ? ` · ${d.embarcacaoNome}` : ""}
                  </p>
                </div>
                <Badge tone={d.dias !== null && d.dias < 0 ? "danger" : d.dias !== null && d.dias <= 15 ? "warning" : "info"} size="sm">
                  {d.vencimento ? formatarDataBR(d.vencimento) : "—"}
                </Badge>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">Gestão de Empresas</h1>
          <p className="max-w-2xl text-body-sm text-outline">
            Acompanhamento da documentação e manutenções das empresas contratantes — o que precisa ser
            resolvido hoje para nenhuma empresa ficar com documentação atrasada.
          </p>
        </div>
        <LinkButton href="/gestao-empresas/nova" icon={Plus}>+ Nova Empresa</LinkButton>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Building2} label="Empresas" value={listaEmpresas.length} />
        <StatCard icon={ShieldCheck} label="Docs em dia" value={emDia} tone="success" />
        <StatCard icon={AlarmClock} label="Vencem ≤ 35 dias" value={proximos.length} tone="info" />
        <StatCard icon={AlarmClock} label="Vencem ≤ 15 dias" value={urgentes.length} tone="warning" />
        <StatCard icon={AlertTriangle} label="Vencidos" value={vencidos.length} tone="danger" />
        <StatCard icon={Wrench} label="Manutenções próximas" value={manutencoesProximas.length} tone="info" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {listaEmpresas.map((e) => (
          <Link
            key={e.id}
            href={`/gestao-empresas/${e.id}`}
            className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="mb-3 inline-flex rounded-pill bg-primary-container p-2.5 text-on-primary-container">
              <Building2 size={18} />
            </span>
            <p className="font-display text-title-md font-semibold text-primary group-hover:underline">{e.razaoSocial}</p>
            <p className="mt-1 text-body-sm text-outline">
              {[e.nomeFantasia, e.cnpj].filter(Boolean).join(" · ")}
            </p>
          </Link>
        ))}
      </div>

      {listaEmpresas.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="Nenhuma empresa cadastrada"
          description="Cadastre a primeira empresa contratante para controlar documentos, embarcações e manutenções."
        />
      ) : (
        <div className="space-y-gutter">
          <ListaAtencao label="🔴 VENCIDOS" linhas={vencidos} vazio="Nenhum documento vencido. 🎉" />
          <ListaAtencao label="🟠 VENCEM EM ATÉ 15 DIAS" linhas={urgentes} vazio="Nenhum documento urgente." />
          <ListaAtencao label="🟡 VENCEM EM ATÉ 35 DIAS" linhas={proximos} vazio="Nenhum documento vencendo em 35 dias." />

          <div className="overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest">
            <div className="border-b border-outline-variant px-4 py-3">
              <h2 className="font-display text-title-md font-semibold text-primary">🔧 MANUTENÇÕES PRÓXIMAS</h2>
            </div>
            {manutencoesProximas.length === 0 ? (
              <p className="px-4 py-4 text-body-sm text-outline">Nenhuma manutenção próxima.</p>
            ) : (
              <ul className="divide-y divide-outline-variant">
                {manutencoesProximas.map((m) => (
                  <li key={m.id}>
                    <Link
                      href={`/gestao-empresas/${m.empresaId}#manutencoes`}
                      className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-surface-container-low"
                    >
                      <div className="min-w-0">
                        <p className="text-body-md text-primary">{nomeEmpresa(m.empresaId)}</p>
                        <p className="text-body-sm text-outline">
                          {m.tipo === "troca_oleo" ? "Troca de óleo" : "Manutenção"}{m.descricao ? ` — ${m.descricao}` : ""}
                          {m.embarcacaoNome ? ` · ${m.embarcacaoNome}` : ""}
                        </p>
                      </div>
                      <Badge tone="warning" size="sm">{m.dias} dia(s)</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
