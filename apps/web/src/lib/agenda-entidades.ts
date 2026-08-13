/** Entidades que um Evento interno pode vincular — dados puros, client-safe (sem acesso a banco). */
export const ENTIDADES_EVENTO = [
  { valor: "cliente", rotulo: "Cliente" },
  { valor: "processo", rotulo: "Processo" },
  { valor: "embarcacao", rotulo: "Embarcação" },
  { valor: "orcamento", rotulo: "Orçamento" },
  { valor: "documento", rotulo: "Documento" },
  { valor: "servico", rotulo: "Serviço" },
  { valor: "obra", rotulo: "Obra" },
  { valor: "taxa", rotulo: "Taxa" },
  { valor: "aluno", rotulo: "Aluno" },
] as const;

export type EntidadeEvento = (typeof ENTIDADES_EVENTO)[number]["valor"];

export function entidadeValida(valor: string): valor is EntidadeEvento {
  return ENTIDADES_EVENTO.some((e) => e.valor === valor);
}
