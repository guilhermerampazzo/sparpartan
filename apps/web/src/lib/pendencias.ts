export type PendenciaCategoria =
  | "clientes"
  | "embarcacoes"
  | "processos"
  | "financeiro"
  | "loja"
  | "escola"
  | "empresa"
  | "pessoal";

export type PendenciaPrioridade = "alta" | "media" | "baixa";

export const PENDENCIA_CATEGORIAS: { value: PendenciaCategoria; label: string; exemplos: string[] }[] = [
  {
    value: "clientes",
    label: "Clientes",
    exemplos: [
      "Retornar ligação",
      "Enviar orçamento",
      "Cobrar documentação",
      "Fazer pós-venda",
      "Solicitar avaliação",
      "Solicitar indicação",
    ],
  },
  {
    value: "embarcacoes",
    label: "Embarcações",
    exemplos: [
      "Falta número do casco",
      "Falta Nota Fiscal",
      "Agendar vistoria",
      "Solicitar fotos",
      "Conferir documentação",
    ],
  },
  {
    value: "processos",
    label: "Processos",
    exemplos: [
      "Protocolar processo",
      "Conferir documentos",
      "Emitir requerimento",
      "Assinaturas pendentes",
      "Processo aguardando retorno da Marinha",
      "Entregar documentação ao cliente",
    ],
  },
  {
    value: "financeiro",
    label: "Financeiro",
    exemplos: [
      "Cobrar pagamento",
      "Emitir boleto",
      "Receber entrada",
      "Pagar fornecedor",
      "Pagar contador",
      "Conferir comissão",
    ],
  },
  {
    value: "loja",
    label: "Loja",
    exemplos: [
      "Enviar catálogo",
      "Elaborar orçamento",
      "Separar embarcação",
      "Separar motor",
      "Solicitar Nota Fiscal",
      "Agendar entrega",
    ],
  },
  {
    value: "escola",
    label: "Escola Náutica",
    exemplos: [
      "Confirmar turma",
      "Confirmar presença",
      "Enviar material",
      "Emitir certificados",
      "Organizar aula prática",
    ],
  },
  {
    value: "empresa",
    label: "Empresa",
    exemplos: [
      "Renovar Certificado Digital",
      "Backup do sistema",
      "Renovar domínio",
      "Atualizar documentos da empresa",
      "Reunião semanal",
      "Treinamentos internos",
    ],
  },
  {
    value: "pessoal",
    label: "Pendências Pessoais",
    exemplos: ["Anotações privadas do meu trabalho"],
  },
];

export function labelCategoria(categoria: string): string {
  return PENDENCIA_CATEGORIAS.find((c) => c.value === categoria)?.label ?? categoria;
}

export const PENDENCIA_PRIORIDADES: { value: PendenciaPrioridade; label: string }[] = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Média" },
  { value: "baixa", label: "Baixa" },
];

export function labelPrioridade(prioridade: string): string {
  return PENDENCIA_PRIORIDADES.find((p) => p.value === prioridade)?.label ?? prioridade;
}

export function paraData(valor: string | Date): Date {
  if (valor instanceof Date) return valor;
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1);
}

export function dataStr(data: Date): string {
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

/** Dias de diferença (positivo = futuro, negativo = atrasada). */
export function diasAtePendencia(data: string | Date): number {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = paraData(data);
  alvo.setHours(0, 0, 0, 0);
  return Math.round((alvo.getTime() - hoje.getTime()) / 86400000);
}

/** Hoje + N dias em formato YYYY-MM-DD. */
export function hojeMais(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return dataStr(d);
}
