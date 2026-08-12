import { notFound } from "next/navigation";
import { eq, desc } from "drizzle-orm";
import { db } from "@/db";
import { pipelineOportunidades, clientes, usuarios, orcamentos } from "@/db/schema";
import { NovaOportunidadeForm } from "../../novo/form";
import { atualizarOportunidade } from "../../actions";

import { BackButton } from "@/components/ui";

export default async function EditarOportunidadePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [oportunidade] = await db
    .select()
    .from(pipelineOportunidades)
    .where(eq(pipelineOportunidades.id, id))
    .limit(1);
  if (!oportunidade) notFound();

  const listaClientes = await db
    .select({ id: clientes.id, nome: clientes.nome })
    .from(clientes)
    .orderBy(clientes.nome);

  const listaUsuarios = await db
    .select({ id: usuarios.id, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(usuarios.nome);

  const listaOrcamentos = await db
    .select({
      id: orcamentos.id,
      numero: orcamentos.numero,
      valor: orcamentos.valor,
      clienteNome: clientes.nome,
    })
    .from(orcamentos)
    .innerJoin(clientes, eq(orcamentos.clienteId, clientes.id))
    .where(eq(orcamentos.status, "pendente"))
    .orderBy(desc(orcamentos.criadoEm))
    .limit(30);

  const oportunidadeInicial = {
    titulo: oportunidade.titulo,
    clienteId: oportunidade.clienteId ?? "",
    telefoneContato: oportunidade.telefoneContato ?? "",
    origem: oportunidade.origem ?? "",
    servicoSolicitado: oportunidade.servicoSolicitado ?? "",
    valorEstimado: oportunidade.valorEstimado ?? "",
    orcamentoId: oportunidade.orcamentoId ?? "",
    responsavelId: oportunidade.responsavelId ?? "",
    ultimoContato: oportunidade.ultimoContatoEm
      ? new Date(oportunidade.ultimoContatoEm).toISOString().slice(0, 10)
      : "",
    proximaAcao: oportunidade.proximaAcao ?? "",
    observacoes: oportunidade.observacoes ?? "",
  };

  const acao = atualizarOportunidade.bind(null, id);

  return (
    <div className="space-y-gutter">
      <BackButton href="/pipeline" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Editar Oportunidade</h1>
      <NovaOportunidadeForm
        listaClientes={listaClientes}
        listaUsuarios={listaUsuarios}
        listaOrcamentos={listaOrcamentos}
        oportunidadeInicial={oportunidadeInicial}
        action={acao}
        submitLabel="Salvar Alterações"
      />
    </div>
  );
}
