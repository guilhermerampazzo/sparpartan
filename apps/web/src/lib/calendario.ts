import { and, eq, gte, isNull, lte, ne, or } from "drizzle-orm";
import { db } from "@/db";
import {
  agendaEventos,
  clientes,
  documentosGerados,
  modelosDocumento,
  embarcacoes,
  salvatagemItens,
  habilitacoes,
  pagamentos,
  servicosContratados,
  orcamentos,
  lembretes,
  solicitacoes,
  processos,
  despesas,
  eventos,
} from "@/db/schema";
import type { FonteCalendarioTipo } from "@/lib/status";

export type ItemCalendario = {
  data: string | Date;
  tipo: FonteCalendarioTipo;
  titulo: string;
  clienteNome: string | null;
  href: string | null;
};

/** Fontes que aparecem ligadas por padrão ao abrir o calendário — prazos e compromissos. */
export const FONTES_PADRAO: FonteCalendarioTipo[] = [
  "agenda",
  "evento_interno",
  "documento_gerado",
  "dpem",
  "salvatagem",
  "habilitacao",
  "pagamento_vencimento",
  "orcamento_validade",
  "lembrete",
  "aniversario",
  "solicitacao",
  "despesa",
];

/** Fatos consumados (histórico) — desligados por padrão, disponíveis via chip. */
export const FONTES_HISTORICO: FonteCalendarioTipo[] = ["protocolo", "venda", "pagamento_recebido"];

export const TODAS_FONTES = [...FONTES_PADRAO, ...FONTES_HISTORICO];

function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Uma query por fonte, cada uma limitada à janela do mês exibido — sem isso o
 * calendário puxaria o histórico inteiro do sistema a cada carregamento.
 */
async function buscarFonte(
  tipo: FonteCalendarioTipo,
  inicio: Date,
  fim: Date,
  mostrarValores: boolean
): Promise<ItemCalendario[]> {
  const inicioStr = toISO(inicio);
  const fimStr = toISO(fim);

  switch (tipo) {
    case "agenda": {
      const linhas = await db
        .select({
          data: agendaEventos.dataHora,
          titulo: agendaEventos.titulo,
          clienteNome: clientes.nome,
          id: agendaEventos.id,
        })
        .from(agendaEventos)
        .leftJoin(clientes, eq(agendaEventos.clienteId, clientes.id))
        .where(
          and(
            gte(agendaEventos.dataHora, inicio),
            lte(agendaEventos.dataHora, fim),
            isNull(clientes.excluidoEm) // reflexo: cliente excluído some da agenda operacional
          )
        );
      return linhas.map((l) => ({ data: l.data, tipo, titulo: l.titulo, clienteNome: l.clienteNome, href: `/agenda/agendamentos/${l.id}` }));
    }

    case "evento_interno": {
      const linhas = await db
        .select({ data: eventos.data, prazo: eventos.prazoSolucao, titulo: eventos.titulo, id: eventos.id, status: eventos.status })
        .from(eventos)
        .where(
          and(
            ne(eventos.status, "arquivado"),
            or(
              and(gte(eventos.data, inicioStr), lte(eventos.data, fimStr)),
              and(gte(eventos.prazoSolucao, inicioStr), lte(eventos.prazoSolucao, fimStr))
            )
          )
        );
      return linhas.map((l) => ({
        data: l.data,
        tipo,
        titulo: l.prazo && l.prazo !== l.data ? `${l.titulo} (prazo ${l.prazo})` : l.titulo,
        clienteNome: null,
        href: `/agenda/eventos/${l.id}`,
      }));
    }

    case "documento_gerado": {
      const linhas = await db
        .select({
          data: documentosGerados.vencimento,
          titulo: modelosDocumento.nome,
          clienteNome: clientes.nome,
          id: documentosGerados.id,
        })
        .from(documentosGerados)
        .innerJoin(modelosDocumento, eq(documentosGerados.modeloId, modelosDocumento.id))
        .innerJoin(clientes, eq(documentosGerados.clienteId, clientes.id))
        .where(
          and(
            gte(documentosGerados.vencimento, inicioStr),
            lte(documentosGerados.vencimento, fimStr)
          )
        );
      return linhas.map((l) => ({
        data: l.data!,
        tipo,
        titulo: l.titulo,
        clienteNome: l.clienteNome,
        href: `/documentos/${l.id}`,
      }));
    }

    case "dpem": {
      const linhas = await db
        .select({ data: embarcacoes.validadeDpem, titulo: embarcacoes.nome, clienteNome: clientes.nome, id: embarcacoes.id })
        .from(embarcacoes)
        .innerJoin(clientes, eq(embarcacoes.clienteId, clientes.id))
        .where(and(gte(embarcacoes.validadeDpem, inicioStr), lte(embarcacoes.validadeDpem, fimStr)));
      return linhas.map((l) => ({
        data: l.data!,
        tipo,
        titulo: `DPEM — ${l.titulo}`,
        clienteNome: l.clienteNome,
        href: `/embarcacoes/${l.id}`,
      }));
    }

    case "salvatagem": {
      const linhas = await db
        .select({
          data: salvatagemItens.validade,
          titulo: salvatagemItens.item,
          embarcacaoNome: embarcacoes.nome,
          clienteNome: clientes.nome,
          embarcacaoId: embarcacoes.id,
        })
        .from(salvatagemItens)
        .innerJoin(embarcacoes, eq(salvatagemItens.embarcacaoId, embarcacoes.id))
        .innerJoin(clientes, eq(embarcacoes.clienteId, clientes.id))
        .where(and(gte(salvatagemItens.validade, inicioStr), lte(salvatagemItens.validade, fimStr)));
      return linhas.map((l) => ({
        data: l.data!,
        tipo,
        titulo: `${l.titulo} — ${l.embarcacaoNome}`,
        clienteNome: l.clienteNome,
        href: `/embarcacoes/${l.embarcacaoId}`,
      }));
    }

    case "habilitacao": {
      const linhas = await db
        .select({ data: habilitacoes.validade, tipoHab: habilitacoes.tipo, clienteNome: clientes.nome, id: clientes.id })
        .from(habilitacoes)
        .innerJoin(clientes, eq(habilitacoes.clienteId, clientes.id))
        .where(and(gte(habilitacoes.validade, inicioStr), lte(habilitacoes.validade, fimStr)));
      return linhas.map((l) => ({
        data: l.data!,
        tipo,
        titulo: `Habilitação ${l.tipoHab}`,
        clienteNome: l.clienteNome,
        href: `/clientes/${l.id}`,
      }));
    }

    case "pagamento_vencimento": {
      const linhas = await db
        .select({ data: pagamentos.dataVencimento, valor: pagamentos.valor, clienteNome: clientes.nome, id: clientes.id })
        .from(pagamentos)
        .innerJoin(servicosContratados, eq(pagamentos.servicoContratadoId, servicosContratados.id))
        .innerJoin(clientes, eq(servicosContratados.clienteId, clientes.id))
        .where(
          and(
            eq(pagamentos.status, "pendente"),
            gte(pagamentos.dataVencimento, inicioStr),
            lte(pagamentos.dataVencimento, fimStr)
          )
        );
      return linhas.map((l) => ({
        data: l.data!,
        tipo,
        titulo: `Cobrança R$ ${Number(l.valor).toFixed(2)}`,
        clienteNome: l.clienteNome,
        href: `/clientes/${l.id}`,
      }));
    }

    case "orcamento_validade": {
      const linhas = await db
        .select({ data: orcamentos.validoAte, numero: orcamentos.numero, clienteNome: clientes.nome, id: orcamentos.id })
        .from(orcamentos)
        .innerJoin(clientes, eq(orcamentos.clienteId, clientes.id))
        .where(
          and(
            eq(orcamentos.status, "pendente"),
            // Reflexo automático: orçamento excluído (soft-delete) some do calendário.
            isNull(orcamentos.excluidoEm),
            gte(orcamentos.validoAte, inicioStr),
            lte(orcamentos.validoAte, fimStr)
          )
        );
      return linhas.map((l) => ({
        data: l.data!,
        tipo,
        titulo: `Orçamento ${l.numero} expira`,
        clienteNome: l.clienteNome,
        href: `/orcamentos/${l.id}`,
      }));
    }

    case "lembrete": {
      const linhas = await db
        .select({ data: lembretes.dataLembrete, mensagem: lembretes.mensagem, clienteNome: clientes.nome })
        .from(lembretes)
        .leftJoin(clientes, eq(lembretes.clienteId, clientes.id))
        .where(
          and(eq(lembretes.resolvido, false), gte(lembretes.dataLembrete, inicioStr), lte(lembretes.dataLembrete, fimStr))
        );
      return linhas.map((l) => ({
        data: l.data,
        tipo,
        titulo: l.mensagem,
        clienteNome: l.clienteNome,
        href: "/pendentes",
      }));
    }

    case "solicitacao": {
      const linhas = await db
        .select({ data: solicitacoes.expiraEm, tipoSol: solicitacoes.tipo, clienteNome: clientes.nome })
        .from(solicitacoes)
        .leftJoin(clientes, eq(solicitacoes.clienteId, clientes.id))
        .where(
          and(eq(solicitacoes.status, "pendente"), gte(solicitacoes.expiraEm, inicio), lte(solicitacoes.expiraEm, fim))
        );
      return linhas.map((l) => ({
        data: l.data,
        tipo,
        titulo: `Link expira: ${l.tipoSol}`,
        clienteNome: l.clienteNome,
        href: "/pendentes",
      }));
    }

    case "aniversario": {
      // Única fonte recorrente: filtra por dia/mês e projeta no ano do mês exibido.
      const linhas = await db
        .select({ id: clientes.id, nome: clientes.nome, dataNascimento: clientes.dataNascimento })
        .from(clientes);
      const resultado: ItemCalendario[] = [];
      for (const c of linhas) {
        if (!c.dataNascimento) continue;
        const [, mes, dia] = c.dataNascimento.split("-").map(Number);
        // Testa a projeção em cada ano coberto pela janela (a janela pode cruzar virada de ano).
        for (let ano = inicio.getFullYear(); ano <= fim.getFullYear(); ano++) {
          const projetado = new Date(ano, mes - 1, dia);
          if (projetado >= inicio && projetado <= fim) {
            resultado.push({
              data: projetado,
              tipo,
              titulo: `Aniversário de ${c.nome}`,
              clienteNome: c.nome,
              href: `/clientes/${c.id}`,
            });
          }
        }
      }
      return resultado;
    }

    case "protocolo": {
      const linhas = await db
        .select({ data: processos.dataProtocolo, numero: processos.numeroProtocolo, clienteNome: clientes.nome, id: processos.id })
        .from(processos)
        .innerJoin(clientes, eq(processos.clienteId, clientes.id))
        .where(and(gte(processos.dataProtocolo, inicioStr), lte(processos.dataProtocolo, fimStr)));
      return linhas.map((l) => ({
        data: l.data!,
        tipo,
        titulo: `Protocolo ${l.numero ?? ""}`,
        clienteNome: l.clienteNome,
        href: `/processos/${l.id}`,
      }));
    }

    case "venda": {
      const linhas = await db
        .select({ data: servicosContratados.dataContratacao, valor: servicosContratados.valor, clienteNome: clientes.nome, id: clientes.id })
        .from(servicosContratados)
        .innerJoin(clientes, eq(servicosContratados.clienteId, clientes.id))
        .where(and(gte(servicosContratados.dataContratacao, inicioStr), lte(servicosContratados.dataContratacao, fimStr)));
      return linhas.map((l) => ({
        data: l.data,
        tipo,
        titulo: `Venda R$ ${Number(l.valor).toFixed(2)}`,
        clienteNome: l.clienteNome,
        href: `/clientes/${l.id}`,
      }));
    }

    case "despesa": {
      const linhas = await db
        .select({ data: despesas.data, descricao: despesas.descricao, valor: despesas.valor })
        .from(despesas)
        .where(and(gte(despesas.data, inicioStr), lte(despesas.data, fimStr)));
      return linhas.map((l) => ({
        data: l.data,
        tipo,
        titulo: mostrarValores ? `${l.descricao} — R$ ${Number(l.valor).toFixed(2)}` : l.descricao,
        clienteNome: null,
        href: "/vendas/despesas",
      }));
    }

    case "pagamento_recebido": {
      const linhas = await db
        .select({ data: pagamentos.dataPagamento, valor: pagamentos.valor, clienteNome: clientes.nome, id: clientes.id })
        .from(pagamentos)
        .innerJoin(servicosContratados, eq(pagamentos.servicoContratadoId, servicosContratados.id))
        .innerJoin(clientes, eq(servicosContratados.clienteId, clientes.id))
        .where(
          and(eq(pagamentos.status, "pago"), gte(pagamentos.dataPagamento, inicioStr), lte(pagamentos.dataPagamento, fimStr))
        );
      return linhas.map((l) => ({
        data: l.data!,
        tipo,
        titulo: `Recebido R$ ${Number(l.valor).toFixed(2)}`,
        clienteNome: l.clienteNome,
        href: `/clientes/${l.id}`,
      }));
    }

    default:
      return [];
  }
}

export async function buscarItensCalendario(
  inicio: Date,
  fim: Date,
  fontesAtivas: FonteCalendarioTipo[],
  mostrarValores = false
): Promise<ItemCalendario[]> {
  const resultados = await Promise.all(
    fontesAtivas.map((tipo) => buscarFonte(tipo, inicio, fim, mostrarValores))
  );
  return resultados.flat();
}

export type CelulaMes = { data: Date; noMesAtual: boolean; hoje: boolean };

/** Grade de 42 células (6×7) com spillover do mês anterior/seguinte. */
export function gradeDoMes(mesRef: Date): { inicio: Date; fim: Date; celulas: CelulaMes[] } {
  const primeiroDiaMes = new Date(mesRef.getFullYear(), mesRef.getMonth(), 1);
  const diaSemanaInicio = primeiroDiaMes.getDay(); // 0=domingo
  const inicio = new Date(primeiroDiaMes);
  inicio.setDate(inicio.getDate() - diaSemanaInicio);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const celulas: CelulaMes[] = [];
  for (let i = 0; i < 42; i++) {
    const data = new Date(inicio);
    data.setDate(data.getDate() + i);
    celulas.push({
      data,
      noMesAtual: data.getMonth() === mesRef.getMonth(),
      hoje: data.getTime() === hoje.getTime(),
    });
  }

  const fim = new Date(celulas[41].data);
  fim.setHours(23, 59, 59, 999);

  return { inicio, fim, celulas };
}
