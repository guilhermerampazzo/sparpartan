import {
  FolderOpen,
  FileWarning,
  PackageCheck,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  ThumbsUp,
  ThumbsDown,
  CalendarX,
  AlertTriangle,
  FileText,
  Stamp,
  FileX,
  CalendarCheck,
  Check,
  X,
  AlertOctagon,
  ShieldCheck,
  Minus,
  GraduationCap,
  AlarmClock,
  Calendar,
  Mail,
  MailWarning,
  PenLine,
  FileSignature,
  CalendarOff,
  Ship,
  LifeBuoy,
  CreditCard,
  Receipt,
  BellRing,
  Cake,
  Link2,
  ShoppingBag,
  Wallet,
  UserPlus,
  Headset,
  Handshake,
  Wrench,
  ClipboardList,
  Star,
  Ban,
  Hourglass,
} from "lucide-react";
import type { StatusInfo } from "@/components/ui/badge";

/* ------------------------------------------------------------------ */
/* Enums do banco → { label, tone, icon }                              */
/* ------------------------------------------------------------------ */

export function statusProcesso(status: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    aberto: { label: "Aberto", tone: "info", icon: FolderOpen },
    documentos_pendentes: { label: "Documentos Pendentes", tone: "warning", icon: FileWarning },
    pronto_para_protocolo: { label: "Pronto para Protocolo", tone: "info", icon: PackageCheck },
    protocolado: { label: "Protocolado", tone: "info", icon: Send },
    concluido: { label: "Concluído", tone: "success", icon: CheckCircle2 },
    cancelado: { label: "Cancelado", tone: "danger", icon: XCircle },
  };
  return map[status] ?? { label: status, tone: "neutral", icon: Minus };
}

export const PROCESSO_STEPS: { key: string; label: string }[] = [
  { key: "aberto", label: "Aberto" },
  { key: "documentos_pendentes", label: "Documentos Pendentes" },
  { key: "pronto_para_protocolo", label: "Pronto p/ Protocolo" },
  { key: "protocolado", label: "Protocolado" },
  { key: "concluido", label: "Concluído" },
];

export function etapaProcesso(status: string): number {
  return PROCESSO_STEPS.findIndex((s) => s.key === status);
}

export function statusPipeline(estagio: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    novo_lead: { label: "Novo Lead", tone: "success", icon: UserPlus },
    primeiro_contato: { label: "Primeiro Contato", tone: "info", icon: Headset },
    aguardando_documentacao: { label: "Aguardando Documentação", tone: "warning", icon: ClipboardList },
    orcamento_enviado: { label: "Orçamento Enviado", tone: "warning", icon: Send },
    negociacao: { label: "Negociação", tone: "warning", icon: Handshake },
    aguardando_pagamento: { label: "Aguardando Pagamento", tone: "warning", icon: Hourglass },
    servico_contratado: { label: "Serviço Contratado", tone: "success", icon: CheckCircle2 },
    em_execucao: { label: "Em Execução", tone: "info", icon: Wrench },
    pos_venda: { label: "Pós-venda", tone: "info", icon: Star },
    concluido: { label: "Concluído", tone: "success", icon: Check },
    perdido: { label: "Perdido", tone: "danger", icon: Ban },
  };
  return map[estagio] ?? { label: estagio, tone: "neutral", icon: Minus };
}

export const PIPELINE_ESTAGIOS: { key: string; label: string; emoji: string }[] = [
  { key: "novo_lead", label: "Novo Lead", emoji: "🟢" },
  { key: "primeiro_contato", label: "Primeiro Contato", emoji: "🔵" },
  { key: "aguardando_documentacao", label: "Aguardando Documentação", emoji: "📋" },
  { key: "orcamento_enviado", label: "Orçamento Enviado", emoji: "📄" },
  { key: "negociacao", label: "Negociação", emoji: "🟠" },
  { key: "aguardando_pagamento", label: "Aguardando Pagamento", emoji: "💰" },
  { key: "servico_contratado", label: "Serviço Contratado", emoji: "🤝" },
  { key: "em_execucao", label: "Em Execução", emoji: "⚙️" },
  { key: "pos_venda", label: "Pós-venda", emoji: "⭐" },
  { key: "concluido", label: "Concluído", emoji: "✅" },
];

export const PIPELINE_ESTAGIO_PERDIDO = { key: "perdido", label: "Perdido", emoji: "🔴" };

export function statusOrcamento(status: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    pendente: { label: "Pendente", tone: "neutral", icon: Clock },
    aprovado: { label: "Aprovado", tone: "success", icon: ThumbsUp },
    recusado: { label: "Recusado", tone: "danger", icon: ThumbsDown },
    expirado: { label: "Expirado", tone: "warning", icon: CalendarX },
  };
  return map[status] ?? { label: status, tone: "neutral", icon: Minus };
}

export function statusPagamento(status: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    pendente: { label: "Pendente", tone: "warning", icon: Clock },
    pago: { label: "Pago", tone: "success", icon: CheckCircle2 },
    atrasado: { label: "Atrasado", tone: "danger", icon: AlertTriangle },
  };
  return map[status] ?? { label: status, tone: "neutral", icon: Minus };
}

export function statusDocumento(status: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    gerado: { label: "Gerado", tone: "info", icon: FileText },
    protocolado: { label: "Protocolado", tone: "success", icon: Stamp },
    vencido: { label: "Vencido", tone: "danger", icon: FileX },
  };
  return map[status] ?? { label: status, tone: "neutral", icon: Minus };
}

export function statusEvento(status: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    pendente: { label: "Pendente", tone: "info", icon: Clock },
    confirmado: { label: "Confirmado", tone: "success", icon: CalendarCheck },
    concluido: { label: "Concluído", tone: "neutral", icon: Check },
    cancelado: { label: "Cancelado", tone: "danger", icon: X },
  };
  return map[status] ?? { label: status, tone: "neutral", icon: Minus };
}

export function tipoEvento(tipo: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    compromisso: { label: "Compromisso", tone: "info", icon: Calendar },
    prova: { label: "Prova", tone: "warning", icon: GraduationCap },
    vencimento: { label: "Vencimento", tone: "danger", icon: AlarmClock },
  };
  return map[tipo] ?? { label: tipo, tone: "neutral", icon: Minus };
}

export function statusAssinatura(status: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    pendente: { label: "Aguardando Assinatura", tone: "warning", icon: PenLine },
    assinado: { label: "Assinado", tone: "success", icon: FileSignature },
    expirado: { label: "Expirado", tone: "danger", icon: CalendarOff },
  };
  return map[status] ?? { label: status, tone: "neutral", icon: Minus };
}

export function statusEnvio(status: string): StatusInfo {
  const map: Record<string, StatusInfo> = {
    enviado: { label: "Enviado", tone: "success", icon: Mail },
    falhou: { label: "Falhou", tone: "danger", icon: MailWarning },
  };
  return map[status] ?? { label: status, tone: "neutral", icon: Minus };
}

/* ------------------------------------------------------------------ */
/* Fontes do calendário — mesmo contrato { label, tone, icon }.        */
/* Prazos usam tone da urgência calculada externamente; aqui só o      */
/* rótulo/ícone da fonte. Fatos consumados (histórico) usam tone fixo. */
/* ------------------------------------------------------------------ */

export type FonteCalendarioTipo =
  | "agenda"
  | "documento_gerado"
  | "dpem"
  | "salvatagem"
  | "habilitacao"
  | "pagamento_vencimento"
  | "orcamento_validade"
  | "lembrete"
  | "aniversario"
  | "solicitacao"
  | "protocolo"
  | "venda"
  | "despesa"
  | "pagamento_recebido";

export function fonteCalendario(tipo: FonteCalendarioTipo): StatusInfo {
  const map: Record<FonteCalendarioTipo, StatusInfo> = {
    agenda: { label: "Agenda", tone: "info", icon: Calendar },
    documento_gerado: { label: "Vencimento de Documento", tone: "danger", icon: FileText },
    dpem: { label: "DPEM", tone: "danger", icon: Ship },
    salvatagem: { label: "Salvatagem", tone: "danger", icon: LifeBuoy },
    habilitacao: { label: "Habilitação (CHA/CIR)", tone: "danger", icon: GraduationCap },
    pagamento_vencimento: { label: "Cobrança", tone: "warning", icon: CreditCard },
    orcamento_validade: { label: "Orçamento Expirando", tone: "warning", icon: Receipt },
    lembrete: { label: "Lembrete/Pendência", tone: "neutral", icon: BellRing },
    aniversario: { label: "Aniversário", tone: "info", icon: Cake },
    solicitacao: { label: "Link Expirando", tone: "warning", icon: Link2 },
    protocolo: { label: "Protocolo", tone: "neutral", icon: Stamp },
    venda: { label: "Venda", tone: "neutral", icon: ShoppingBag },
    despesa: { label: "Despesa", tone: "neutral", icon: Wallet },
    pagamento_recebido: { label: "Pagamento Recebido", tone: "neutral", icon: CheckCircle2 },
  };
  return map[tipo];
}

/* ------------------------------------------------------------------ */
/* Urgência de vencimento — usada por documentos, DPEM, habilitações,  */
/* salvatagem, orçamentos, etc. Faixas mutuamente exclusivas.          */
/* ------------------------------------------------------------------ */

export type Urgencia = "vencido" | "critico" | "atencao" | "em_dia" | "sem_data";

export function paraData(valor: string | Date): Date {
  if (valor instanceof Date) return valor;
  // Datas "YYYY-MM-DD" do Postgres devem ser lidas como data local, não UTC.
  const [ano, mes, dia] = valor.split("-").map(Number);
  return new Date(ano, (mes ?? 1) - 1, dia ?? 1);
}

function inicioDoDia(data: Date): Date {
  const d = new Date(data);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function diasAte(data: string | Date, hoje: Date = new Date()): number {
  const alvo = inicioDoDia(paraData(data));
  const base = inicioDoDia(hoje);
  return Math.round((alvo.getTime() - base.getTime()) / 86400000);
}

export function urgenciaVencimento(
  data: string | Date | null | undefined,
  hoje: Date = new Date()
): Urgencia {
  if (!data) return "sem_data";
  const dias = diasAte(data, hoje);
  if (dias < 0) return "vencido";
  if (dias <= 7) return "critico";
  if (dias <= 30) return "atencao";
  return "em_dia";
}

export function infoUrgencia(urgencia: Urgencia): StatusInfo {
  const map: Record<Urgencia, StatusInfo> = {
    vencido: { label: "Vencido", tone: "danger", icon: AlertOctagon },
    critico: { label: "Vence em breve", tone: "danger", icon: AlertTriangle },
    atencao: { label: "Vencendo", tone: "warning", icon: Clock },
    em_dia: { label: "Em Dia", tone: "success", icon: ShieldCheck },
    sem_data: { label: "Sem Data", tone: "neutral", icon: Minus },
  };
  return map[urgencia];
}

/** Protocolo da Marinha é válido por 60 dias a partir da data de protocolo. */
export function vencimentoProtocolo(dataProtocolo: string | Date): Date {
  const venc = new Date(paraData(dataProtocolo));
  venc.setDate(venc.getDate() + 60);
  return venc;
}

export function rotuloPrazo(data: string | Date, hoje: Date = new Date()): string {
  const dias = diasAte(data, hoje);
  if (dias === 0) return "hoje";
  if (dias === 1) return "amanhã";
  if (dias === -1) return "ontem";
  if (dias > 0) return `em ${dias} dias`;
  return `há ${Math.abs(dias)} dias`;
}

/* ------------------------------------------------------------------ */
/* Agregação — ordena qualquer lista com campo `data` por urgência     */
/* ------------------------------------------------------------------ */

const ORDEM_URGENCIA: Record<Urgencia, number> = {
  vencido: 0,
  critico: 1,
  atencao: 2,
  em_dia: 3,
  sem_data: 4,
};

export function ordenarPorUrgencia<T extends { data: string | Date | null }>(itens: T[]): T[] {
  return [...itens].sort((a, b) => {
    const ua = urgenciaVencimento(a.data);
    const ub = urgenciaVencimento(b.data);
    if (ua !== ub) return ORDEM_URGENCIA[ua] - ORDEM_URGENCIA[ub];
    if (!a.data || !b.data) return 0;
    return paraData(a.data).getTime() - paraData(b.data).getTime();
  });
}
