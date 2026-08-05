import { eq, and } from "drizzle-orm";
import { CheckCircle2, Clock } from "lucide-react";
import { db } from "@/db";
import {
  clientes,
  processos,
  servicos,
  orcamentos,
  requisitosDocumento,
  arquivos,
} from "@/db/schema";
import { buscarSolicitacaoValida } from "@/lib/solicitacoes";
import { Badge, StatusBadge, Stepper, ProgressBar, Campo, CampoSelect, SectionCard, Button, CampoCep, CampoCnpj, CampoOcr } from "@/components/ui";
import { PROCESSO_STEPS, statusOrcamento } from "@/lib/status";
import {
  concluirCadastroCliente,
  enviarDocumentoRequisito,
  concluirDocumentosProcesso,
  concluirCadastroEmbarcacao,
  aprovarOrcamentoPublico,
  recusarOrcamentoPublico,
} from "./actions";

function Casca({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-2xl space-y-6">
        <div>
          <h1 className="font-display text-headline-md font-bold text-primary">{titulo}</h1>
          <p className="text-body-sm text-outline">Sparapan Solução Naval</p>
        </div>
        {children}
      </div>
    </main>
  );
}

export default async function SolicitacaoPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { solicitacao, expirada } = await buscarSolicitacaoValida(token);

  if (!solicitacao) {
    return (
      <Casca titulo="Link inválido">
        <p className="rounded-lg bg-danger-container p-4 text-body-sm text-on-danger-container">
          Este link não existe. Confira se copiou o endereço completo.
        </p>
      </Casca>
    );
  }

  if (expirada) {
    return (
      <Casca titulo="Link expirado">
        <p className="rounded-lg bg-danger-container p-4 text-body-sm text-on-danger-container">
          Este link expirou. Entre em contato com a Sparapan para gerar um novo.
        </p>
      </Casca>
    );
  }

  const concluida = solicitacao.status === "concluida";

  if (solicitacao.tipo === "cadastro_cliente") {
    const cliente = solicitacao.clienteId
      ? (await db.select().from(clientes).where(eq(clientes.id, solicitacao.clienteId)).limit(1))[0]
      : null;
    const enviarComToken = concluirCadastroCliente.bind(null, token);

    return (
      <Casca titulo={cliente ? "Atualize seus dados" : "Complete seu cadastro"}>
        {concluida ? (
          <p className="rounded-lg bg-success-container p-4 text-body-sm text-on-success-container">
            Cadastro enviado com sucesso. Obrigado! A equipe da Sparapan vai dar continuidade.
          </p>
        ) : (
          <form action={enviarComToken} className="space-y-6">
            <CampoOcr camposDestino={{ nome: "nome", cpfCnpj: "cpfCnpj" }} />

            <SectionCard title="Seus dados">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Nome" name="nome" required defaultValue={cliente?.nome ?? ""} />
                <CampoSelect
                  label="Tipo"
                  name="tipo"
                  defaultValue={cliente?.tipo ?? "pessoa_fisica"}
                  options={[
                    { value: "pessoa_fisica", label: "Pessoa Física" },
                    { value: "pessoa_juridica", label: "Pessoa Jurídica" },
                  ]}
                />
                <CampoCnpj
                  label="CPF/CNPJ"
                  name="cpfCnpj"
                  required
                  defaultValue={cliente?.cpfCnpj ?? ""}
                  camposEmpresa={{ nome: "nome", cep: "cep", rua: "rua", bairro: "bairro", cidade: "cidade", uf: "uf" }}
                />
                <Campo label="E-mail" name="email" type="email" defaultValue={cliente?.email ?? ""} />
                <Campo label="Telefone" name="telefone" defaultValue={cliente?.telefone ?? ""} />
                <Campo label="Celular" name="celular" defaultValue={cliente?.celular ?? ""} />
              </div>
            </SectionCard>

            <SectionCard title="Endereço">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <CampoCep
                  name="cep"
                  defaultValue={cliente?.cep ?? ""}
                  camposEndereco={{ rua: "rua", bairro: "bairro", cidade: "cidade", uf: "uf" }}
                />
                <Campo label="Rua" name="rua" defaultValue={cliente?.rua ?? ""} />
                <Campo label="Número" name="numero" defaultValue={cliente?.numero ?? ""} />
                <Campo label="Complemento" name="complemento" defaultValue={cliente?.complemento ?? ""} />
                <Campo label="Bairro" name="bairro" defaultValue={cliente?.bairro ?? ""} />
                <Campo label="Cidade" name="cidade" defaultValue={cliente?.cidade ?? ""} />
                <Campo label="UF" name="uf" defaultValue={cliente?.uf ?? ""} />
              </div>
            </SectionCard>

            <SectionCard title="Documentos (RG, CPF, comprovante...)">
              <input
                type="file"
                name="documentos"
                multiple
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              />
            </SectionCard>

            <Button type="submit" className="w-full">
              Enviar
            </Button>
          </form>
        )}
      </Casca>
    );
  }

  if (solicitacao.tipo === "documentos_processo") {
    if (!solicitacao.processoId) return <Casca titulo="Erro">Solicitação inválida.</Casca>;
    const [processo] = await db.select().from(processos).where(eq(processos.id, solicitacao.processoId)).limit(1);
    const requisitos = await db
      .select()
      .from(requisitosDocumento)
      .where(and(eq(requisitosDocumento.servicoId, processo.servicoId), eq(requisitosDocumento.ativo, true)));
    const enviados = await db.select().from(arquivos).where(eq(arquivos.processoId, solicitacao.processoId));

    const obrigatorios = requisitos.filter((r) => r.obrigatorio);
    const enviadosCount = obrigatorios.filter((r) => enviados.some((a) => a.requisitoId === r.id)).length;
    const tudoEnviado = obrigatorios.length > 0 && enviadosCount === obrigatorios.length;
    const concluirComToken = concluirDocumentosProcesso.bind(null, token);

    return (
      <Casca titulo="Documentos pendentes">
        {concluida ? (
          <p className="rounded-lg bg-success-container p-4 text-body-sm text-on-success-container">
            Documentos enviados. Obrigado!
          </p>
        ) : (
          <div className="space-y-6">
            <ProgressBar value={enviadosCount} total={Math.max(obrigatorios.length, 1)} label="Documentos enviados" />
            <ul className="space-y-3">
              {requisitos.map((r) => {
                const jaEnviado = enviados.find((a) => a.requisitoId === r.id);
                const enviarComReq = enviarDocumentoRequisito.bind(null, token, r.id);
                return (
                  <li key={r.id} className="rounded-lg border border-outline-variant p-4">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-body-md text-primary">{r.nome}</span>
                      {jaEnviado ? (
                        <Badge tone="success" icon={CheckCircle2} size="sm">Enviado</Badge>
                      ) : r.obrigatorio ? (
                        <Badge tone="warning" icon={Clock} size="sm">Pendente</Badge>
                      ) : null}
                    </div>
                    {!jaEnviado && (
                      <form action={enviarComReq} className="flex items-center gap-3">
                        <input
                          type="file"
                          name="arquivo"
                          required
                          className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
                        />
                        <Button type="submit" size="sm">
                          Enviar
                        </Button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
            {tudoEnviado && (
              <form action={concluirComToken}>
                <Button type="submit" className="w-full">
                  Concluir envio
                </Button>
              </form>
            )}
          </div>
        )}
      </Casca>
    );
  }

  if (solicitacao.tipo === "cadastro_embarcacao") {
    const enviarComToken = concluirCadastroEmbarcacao.bind(null, token);
    return (
      <Casca titulo="Cadastre sua embarcação">
        {concluida ? (
          <p className="rounded-lg bg-success-container p-4 text-body-sm text-on-success-container">
            Embarcação cadastrada. A equipe vai completar os dados técnicos.
          </p>
        ) : (
          <form action={enviarComToken} className="space-y-6">
            <SectionCard title="Identificação">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Campo label="Nome da embarcação" name="nome" required />
                <Campo label="Tipo (lancha, jetski, veleiro...)" name="tipo" />
                <Campo label="Número de inscrição (se já tiver)" name="numeroInscricao" />
                <Campo label="Ano" name="ano" type="number" />
                <Campo label="Comprimento (m)" name="comprimento" type="number" />
                <Campo label="Número do casco" name="numeroCasco" />
                <Campo label="Material do casco" name="materialCasco" />
                <Campo label="Construtor" name="construtor" />
                <Campo label="Cor" name="cor" />
              </div>
            </SectionCard>

            <SectionCard title="Documento da embarcação">
              <input
                type="file"
                name="documento"
                className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-primary outline-none focus:border-primary"
              />
            </SectionCard>

            <Button type="submit" className="w-full">
              Enviar
            </Button>
          </form>
        )}
      </Casca>
    );
  }

  if (solicitacao.tipo === "aprovacao_orcamento") {
    if (!solicitacao.orcamentoId) return <Casca titulo="Erro">Solicitação inválida.</Casca>;
    const [orcamento] = await db.select().from(orcamentos).where(eq(orcamentos.id, solicitacao.orcamentoId)).limit(1);
    const [servico] = orcamento.servicoId
      ? await db.select().from(servicos).where(eq(servicos.id, orcamento.servicoId)).limit(1)
      : [];
    const aprovarComToken = aprovarOrcamentoPublico.bind(null, token);
    const recusarComToken = recusarOrcamentoPublico.bind(null, token);
    const valorFormatado = Number(orcamento.valor).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

    return (
      <Casca titulo={`Orçamento ${orcamento.numero}`}>
        <SectionCard title="Detalhes">
          <div className="space-y-2 text-body-md text-primary">
            <p>Serviço: <strong>{servico?.nome ?? orcamento.descricao ?? "—"}</strong></p>
            <p>Valor: <strong>{valorFormatado}</strong></p>
            {orcamento.validoAte && <p>Válido até: <strong>{orcamento.validoAte}</strong></p>}
            <StatusBadge status={statusOrcamento(orcamento.status)} />
          </div>
        </SectionCard>

        {orcamento.status === "pendente" && !concluida && (
          <div className="flex gap-3">
            <form action={aprovarComToken} className="flex-1">
              <Button type="submit" className="w-full">
                Aprovar
              </Button>
            </form>
            <form action={recusarComToken} className="flex-1">
              <Button type="submit" variant="outlined" className="w-full">
                Recusar
              </Button>
            </form>
          </div>
        )}
      </Casca>
    );
  }

  if (solicitacao.tipo === "acompanhamento_processo") {
    if (!solicitacao.processoId) return <Casca titulo="Erro">Solicitação inválida.</Casca>;
    const [processo] = await db.select().from(processos).where(eq(processos.id, solicitacao.processoId)).limit(1);
    const [servico] = await db.select().from(servicos).where(eq(servicos.id, processo.servicoId)).limit(1);
    const cancelado = processo.status === "cancelado";

    return (
      <Casca titulo="Acompanhamento do processo">
        <SectionCard title={servico?.nome ?? "Processo"}>
          <Stepper steps={PROCESSO_STEPS} currentKey={processo.status} cancelled={cancelado} />
          {processo.numeroProtocolo && (
            <p className="mt-4 text-body-sm text-outline">Protocolo: {processo.numeroProtocolo}</p>
          )}
        </SectionCard>
      </Casca>
    );
  }

  return <Casca titulo="Erro">Tipo de solicitação desconhecido.</Casca>;
}
