export const LOJA_CATEGORIAS = [
  { value: "embarcacao", label: "Embarcações" },
  { value: "motor", label: "Motores" },
  { value: "equipamento_nautico", label: "Equipamentos Náuticos" },
  { value: "acessorio", label: "Acessórios" },
  { value: "pesca", label: "Pesca" },
  { value: "servico", label: "Serviços" },
] as const;

export type LojaCategoria = (typeof LOJA_CATEGORIAS)[number]["value"];

export function rotuloCategoria(valor: string) {
  return LOJA_CATEGORIAS.find((c) => c.value === valor)?.label ?? valor;
}

export const LOJA_ORCAMENTO_STATUS = [
  { value: "pendente", label: "Pendente", tone: "warning" as const },
  { value: "aprovado", label: "Aprovado", tone: "success" as const },
  { value: "recusado", label: "Recusado", tone: "danger" as const },
];

export const LOJA_VENDA_STATUS = [
  { value: "em_andamento", label: "Em Andamento", tone: "info" as const },
  { value: "concluida", label: "Concluída", tone: "success" as const },
  { value: "cancelada", label: "Cancelada", tone: "danger" as const },
];

export function infoStatusOrcamento(status: string) {
  return LOJA_ORCAMENTO_STATUS.find((s) => s.value === status) ?? LOJA_ORCAMENTO_STATUS[0];
}

export function infoStatusVenda(status: string) {
  return LOJA_VENDA_STATUS.find((s) => s.value === status) ?? LOJA_VENDA_STATUS[0];
}

export function formatarMoeda(valor: string | number | null | undefined) {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
