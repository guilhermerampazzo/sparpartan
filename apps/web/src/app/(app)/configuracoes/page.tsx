import Link from "next/link";
import { ClipboardList, Trash2, Download, ScanText, FileStack, Landmark, UserCog, Image as ImageIcon } from "lucide-react";
import { auth } from "@/lib/auth";

import { BackButton } from "@/components/ui";

export default async function ConfiguracoesPage() {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;

  const cartoes = [
    {
      href: "/configuracoes/modelos",
      icon: FileStack,
      title: "Modelos de Documento",
      description: "Modelos cadastrados, importação e substituição de arquivo.",
    },
    role === "admin" && {
      href: "/configuracoes/auditoria",
      icon: ClipboardList,
      title: "Log de Auditoria",
      description: "Histórico de ações da equipe no sistema.",
    },
    role === "admin" && {
      href: "/configuracoes/usuarios",
      icon: UserCog,
      title: "Usuários",
      description: "Controle de acesso: quais módulos cada colaborador pode ver.",
    },
    {
      href: "/clientes/lixeira",
      icon: Trash2,
      title: "Lixeira",
      description: "Clientes excluídos nos últimos 30 dias.",
    },
    {
      href: "/api/exportar/clientes",
      icon: Download,
      title: "Exportar Clientes (CSV)",
      description: "Exportação em massa de todos os cadastros.",
    },
    {
      href: "/ocr",
      icon: ScanText,
      title: "OCR de Documento",
      description: "Extrai texto de uma foto de RG/CRLV para copiar no cadastro.",
    },
    {
      href: "/configuracoes/contas-bancarias",
      icon: Landmark,
      title: "Contas Bancárias",
      description: "Contas usadas para receber pagamentos, disponíveis nos orçamentos.",
    },
    {
      href: "/configuracoes/logo",
      icon: ImageIcon,
      title: "Logo do Sistema",
      description: "Envie uma imagem para substituir o logo em todo o sistema.",
    },
  ].filter(Boolean) as { href: string; icon: typeof ClipboardList; title: string; description: string }[];

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <h1 className="font-display text-headline-lg font-bold text-primary">Configurações</h1>

      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2">
        {cartoes.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="rounded-pill bg-primary-container p-2.5 text-on-primary-container">
              <c.icon size={20} />
            </span>
            <div>
              <p className="font-display text-title-md font-semibold text-primary">{c.title}</p>
              <p className="text-body-sm text-outline">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
