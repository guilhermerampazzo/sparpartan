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
  { value: "rascunho", label: "Rascunho", tone: "neutral" as const },
  { value: "enviado", label: "Enviado", tone: "info" as const },
  { value: "aguardando_aprovacao", label: "Aguardando aprovação", tone: "warning" as const },
  { value: "aprovado", label: "Aprovado", tone: "success" as const },
  { value: "recusado", label: "Recusado", tone: "danger" as const },
  { value: "expirado", label: "Expirado", tone: "neutral" as const },
  { value: "convertido", label: "Convertido em venda", tone: "success" as const },
  { value: "pendente", label: "Pendente", tone: "warning" as const },
];

export const LOJA_VENDA_STATUS = [
  { value: "aprovada", label: "Venda aprovada", tone: "info" as const },
  { value: "aguardando_pagamento", label: "Aguardando pagamento", tone: "warning" as const },
  { value: "pagamento_parcial", label: "Pagamento parcial", tone: "warning" as const },
  { value: "pago", label: "Pago", tone: "success" as const },
  { value: "preparando_entrega", label: "Preparando entrega", tone: "info" as const },
  { value: "entregue", label: "Entregue", tone: "success" as const },
  { value: "cancelada", label: "Cancelada", tone: "danger" as const },
  { value: "em_andamento", label: "Em andamento", tone: "info" as const },
  { value: "concluida", label: "Concluída", tone: "success" as const },
];

export const LOJA_COMPRA_STATUS = [
  { value: "rascunho", label: "Rascunho", tone: "neutral" as const },
  { value: "aguardando_envio", label: "Aguardando envio", tone: "info" as const },
  { value: "pedido_enviado", label: "Pedido enviado", tone: "info" as const },
  { value: "aguardando_fornecedor", label: "Aguardando fornecedor", tone: "warning" as const },
  { value: "confirmado", label: "Confirmado", tone: "info" as const },
  { value: "em_transporte", label: "Em transporte", tone: "warning" as const },
  { value: "recebido", label: "Recebido", tone: "success" as const },
  { value: "finalizado", label: "Finalizado", tone: "success" as const },
  { value: "cancelado", label: "Cancelado", tone: "danger" as const },
];

export const LOJA_ENTREGA_STATUS = [
  { value: "aguardando", label: "Aguardando entrega", tone: "info" as const },
  { value: "preparando", label: "Preparando", tone: "warning" as const },
  { value: "em_transporte", label: "Em transporte", tone: "warning" as const },
  { value: "entregue", label: "Entregue", tone: "success" as const },
];

export function infoStatusCompra(status: string) {
  return LOJA_COMPRA_STATUS.find((s) => s.value === status) ?? LOJA_COMPRA_STATUS[0];
}

export function infoStatusOrcamento(status: string) {
  return LOJA_ORCAMENTO_STATUS.find((s) => s.value === status) ?? LOJA_ORCAMENTO_STATUS[0];
}

export function infoStatusVenda(status: string) {
  return LOJA_VENDA_STATUS.find((s) => s.value === status) ?? LOJA_VENDA_STATUS[0];
}

export function infoStatusEntrega(status: string) {
  return LOJA_ENTREGA_STATUS.find((s) => s.value === status) ?? LOJA_ENTREGA_STATUS[0];
}

export function formatarMoeda(valor: string | number | null | undefined) {
  const numero = Number(valor ?? 0);
  return numero.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
