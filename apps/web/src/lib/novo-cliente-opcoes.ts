/** Opções de serviço na criação do cliente (seleção por ícones) — dados puros, client-safe. */
export const OPCOES_SERVICO_NOVO_CLIENTE = [
  { valor: "orcamento", rotulo: "Orçamento" },
  { valor: "escola", rotulo: "Escola Náutica" },
  { valor: "esporte_recreio", rotulo: "Embarcação Esporte e Recreio" },
  { valor: "comercial", rotulo: "Embarcação Comercial" },
  { valor: "obras", rotulo: "Obras" },
] as const;

export type OpcaoServicoNovoCliente = (typeof OPCOES_SERVICO_NOVO_CLIENTE)[number]["valor"];

export function opcaoServicoValida(valor: string): valor is OpcaoServicoNovoCliente {
  return OPCOES_SERVICO_NOVO_CLIENTE.some((o) => o.valor === valor);
}
