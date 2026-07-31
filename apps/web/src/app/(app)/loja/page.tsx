import Link from "next/link";
import { Package, Receipt, ShoppingBag, FileText, Truck, Settings } from "lucide-react";

const CARTOES = [
  {
    href: "/loja/catalogo",
    icon: Package,
    title: "Catálogo",
    description: "Produtos por categoria: embarcações, motores, equipamentos, acessórios, pesca e serviços.",
  },
  {
    href: "/loja/orcamentos",
    icon: Receipt,
    title: "Orçamentos",
    description: "Propostas comerciais da loja. Ao aprovar, vira venda automaticamente.",
  },
  {
    href: "/loja/vendas",
    icon: ShoppingBag,
    title: "Vendas",
    description: "Ficha de cada venda: financeiro, documentos, checklist e histórico.",
  },
  {
    href: "/loja/documentos",
    icon: FileText,
    title: "Documentos",
    description: "Contratos, pedidos, garantias, notas fiscais e recibos das vendas da loja.",
  },
  {
    href: "/loja/entregas",
    icon: Truck,
    title: "Entregas",
    description: "Painel de entregas pendentes: cliente, produto, cidade e status.",
  },
  {
    href: "/loja/administracao",
    icon: Settings,
    title: "Administração",
    description: "Fabricantes, fornecedores e transportadoras cadastrados na loja.",
  },
];

export default function LojaPage() {
  return (
    <div className="space-y-gutter">
      <div>
        <h1 className="font-display text-headline-lg font-bold text-primary">Loja</h1>
        <p className="text-body-md text-on-surface-variant">
          Módulo independente para venda de embarcações, motores, equipamentos e acessórios.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-gutter sm:grid-cols-2 lg:grid-cols-3">
        {CARTOES.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="flex items-start gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-6 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <span className="rounded-pill bg-primary-container p-2.5 text-on-primary-container">
              <c.icon size={22} />
            </span>
            <div>
              <h2 className="font-display text-title-md font-semibold text-primary">{c.title}</h2>
              <p className="text-body-sm text-on-surface-variant">{c.description}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
