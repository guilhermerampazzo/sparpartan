import { asc } from "drizzle-orm";
import { Truck, Plus } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { lojaFornecedores } from "@/db/schema";
import { EmptyState, LinkButton, BackButton } from "@/components/ui";

export default async function FornecedoresPage() {
  const lista = await db.select().from(lojaFornecedores).orderBy(asc(lojaFornecedores.razaoSocial));

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">Fornecedores</h1>
          <p className="text-body-sm text-outline">
            Cadastro completo com produtos fornecidos — quem fornece cada produto e quanto pagamos.
          </p>
        </div>
        <LinkButton href="/loja/fornecedores/nova" icon={Plus}>+ Novo Fornecedor</LinkButton>
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={Truck} title="Nenhum fornecedor cadastrado" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((f) => (
            <Link
              key={f.id}
              href={`/loja/fornecedores/${f.id}`}
              className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <span className="mb-3 inline-flex rounded-pill bg-primary-container p-2.5 text-on-primary-container">
                <Truck size={18} />
              </span>
              <p className="font-display text-title-md font-semibold text-primary group-hover:underline">
                {f.razaoSocial}
              </p>
              <p className="mt-1 text-body-sm text-outline">
                {[f.nomeFantasia, f.cnpj, f.cidade].filter(Boolean).join(" · ")}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
