import Link from "next/link";
import { eq } from "drizzle-orm";
import { Kanban, LayoutDashboard } from "lucide-react";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { CampoSelect } from "@/components/ui/form-field";
import { PipelineComercial } from "./pipeline-comercial";
import { CentralOperacional } from "./central-operacional";

import { BackButton } from "@/components/ui";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default async function PipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ aba?: string; resp?: string; estagio?: string }>;
}) {
  const params = await searchParams;
  const aba = params.aba === "operacional" ? "operacional" : "comercial";
  const responsavelId = params.resp && UUID_RE.test(params.resp) ? params.resp : undefined;
  const estagioDestacado = params.estagio ? decodeURIComponent(params.estagio) : undefined;

  const listaUsuarios = await db
    .select({ id: usuarios.id, nome: usuarios.nome })
    .from(usuarios)
    .where(eq(usuarios.ativo, true))
    .orderBy(usuarios.nome);

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Pipeline</h1>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-outline-variant pb-3">
        <div className="flex gap-2">
          <Link
            href="/pipeline"
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
              aba === "comercial" ? "bg-primary-container text-on-primary-container" : "text-outline hover:bg-surface-container-low"
            }`}
          >
            <Kanban size={16} /> Pipeline Comercial
          </Link>
          <Link
            href="/pipeline?aba=operacional"
            className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium ${
              aba === "operacional" ? "bg-primary-container text-on-primary-container" : "text-outline hover:bg-surface-container-low"
            }`}
          >
            <LayoutDashboard size={16} /> Central Operacional
          </Link>
        </div>
        {aba === "operacional" && (
          <form method="get" className="flex items-end gap-2">
            <input type="hidden" name="aba" value="operacional" />
            <div className="w-64">
              <CampoSelect
                label="Filtrar por responsável"
                name="resp"
                defaultValue={responsavelId ?? ""}
                options={[
                  { value: "", label: "Todos" },
                  ...listaUsuarios.map((u) => ({ value: u.id, label: u.nome })),
                ]}
              />
            </div>
            <button
              type="submit"
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm text-primary hover:bg-surface-container-low"
            >
              Filtrar
            </button>
          </form>
        )}
      </div>

      {aba === "comercial" ? (
        <PipelineComercial estagioDestacado={estagioDestacado} />
      ) : (
        <CentralOperacional responsavelId={responsavelId} />
      )}
    </div>
  );
}
