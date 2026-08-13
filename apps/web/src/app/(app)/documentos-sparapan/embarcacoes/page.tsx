import { desc, eq } from "drizzle-orm";
import { Ship, Plus, Pencil, Trash2, Download } from "lucide-react";
import Link from "next/link";
import { db } from "@/db";
import { embarcacoesSparapan } from "@/db/schema";
import { Button, ConfirmButton, EmptyState, LinkButton, BackButton } from "@/components/ui";
import { Campo, SectionCard } from "@/components/ui/form-field";
import { criarEmbarcacaoSparapan, atualizarEmbarcacaoSparapan, excluirEmbarcacaoSparapan } from "../actions";

export default async function EmbarcacoesSparapanPage() {
  const lista = await db.select().from(embarcacoesSparapan).orderBy(embarcacoesSparapan.nome);

  return (
    <div className="space-y-gutter">
      <BackButton href="/documentos-sparapan" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-headline-lg font-bold text-primary">Embarcações Sparapan</h1>
          <p className="text-body-sm text-outline">
            Cada embarcação da empresa tem sua própria pasta: documentos, seguro obrigatório, fotos e arquivos.
          </p>
        </div>
        <LinkButton href="/documentos-sparapan/embarcacoes/nova" icon={Plus}>
          + Nova Embarcação
        </LinkButton>
      </div>

      {lista.length === 0 ? (
        <EmptyState icon={Ship} title="Nenhuma embarcação cadastrada" />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {lista.map((e) => (
            <Link
              key={e.id}
              href={`/documentos-sparapan/embarcacoes/${e.id}`}
              className="group rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-card transition-shadow hover:shadow-card-hover"
            >
              <span className="mb-3 inline-flex rounded-pill bg-primary-container p-2.5 text-on-primary-container">
                <Ship size={18} />
              </span>
              <p className="font-display text-title-md font-semibold text-primary group-hover:underline">
                {e.nome}
              </p>
              {e.numeroInscricao && (
                <p className="mt-1 text-body-sm text-outline">Inscrição: {e.numeroInscricao}</p>
              )}
              {(e.tipo || e.anoFabricacao) && (
                <p className="text-body-sm text-outline">
                  {[e.tipo, e.anoFabricacao].filter(Boolean).join(" · ")}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
