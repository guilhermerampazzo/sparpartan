import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  FileStack,
  Clock,
  FileText,
  Wrench,
  Folder,
  BarChart3,
  Mail,
  AlarmClock,
  GraduationCap,
  Settings,
  Receipt,
  HardHat,
  BookOpen,
  UserCog,
  Landmark,
  Building2,
  BookMarked,
  MessageSquare,
  Kanban,
  Store,
  Ship,
  Anchor,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  children?: NavItem[];
  /** Esconde o submenu na sidebar — os filhos viram opções dentro da própria página (padrão da Loja). */
  esconderSubmenu?: boolean;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/pipeline", label: "Pipeline Comercial", icon: Kanban },
  { href: "/orcamentos", label: "Orçamentos", icon: Receipt },
  { href: "/taxas", label: "Taxas", icon: Landmark },
  { href: "/pendencias", label: "Central de Pendências", icon: AlarmClock },
  { href: "/chat", label: "Chat da Equipe", icon: MessageSquare },
  { href: "/clientes", label: "Clientes", icon: Users },
  {
    href: "/documentos",
    label: "Documentos",
    icon: FileText,
  },
  { href: "/servicos", label: "Serviços", icon: Wrench },
  { href: "/arquivos", label: "Arquivos", icon: Folder },
  { href: "/documentos-sparapan", label: "Documentos Sparapan", icon: BookMarked },
  { href: "/vendas", label: "Financeiro", icon: BarChart3 },
  { href: "/emails", label: "Enviar E-mails", icon: Mail },
  {
    href: "/escola",
    label: "Escola Náutica",
    icon: GraduationCap,
    esconderSubmenu: true,
    children: [
      { href: "/lms/materias", label: "LMS", icon: BookOpen },
      { href: "/alunos", label: "Alunos", icon: UserCog },
      { href: "/area-de-estudos", label: "Área de Estudos", icon: BookMarked },
    ],
  },
  { href: "/configuracoes", label: "Configurações", icon: Settings },
  { href: "/gestao-empresas", label: "Gestão de Empresas", icon: Building2 },
  { href: "/loja", label: "Loja", icon: Store },
];

export const MOBILE_NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home", icon: LayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: CalendarDays },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/documentos", label: "Docs", icon: FileText },
  { href: "/configuracoes", label: "Menu", icon: Settings },
];
