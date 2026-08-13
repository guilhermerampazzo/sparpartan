import { Users } from "lucide-react";
import { LinkButton, Button, BackButton } from "@/components/ui";
import { GradeClientes } from "@/components/clientes/grade-clientes";
import { listarClientesResumo } from "@/lib/clientes";
import { gerarLinkCadastroNovoCliente } from "./actions";

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ link?: string }>;
}) {
  const { link } = await searchParams;
  const clientes = await listarClientesResumo();

  return (
    <div className="space-y-gutter">
      <BackButton href="/" />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-headline-lg font-bold text-primary">Clientes</h1>
        <div className="flex flex-wrap gap-2">
          <LinkButton href="/clientes/lixeira" variant="outlined" size="sm">
            Lixeira
          </LinkButton>
          <LinkButton href="/clientes/indicacoes" variant="outlined" size="sm">
            Indicações
          </LinkButton>
          <LinkButton href="/clientes/aniversariantes" variant="outlined" size="sm">
            Aniversariantes
          </LinkButton>
          <LinkButton href="/clientes/novo">+ Novo Cliente</LinkButton>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <GradeClientes clientes={clientes} />
      </div>

      <form action={gerarLinkCadastroNovoCliente} className="w-fit">
        <Button type="submit" variant="outlined" size="sm">
          Gerar link para cliente se cadastrar
        </Button>
      </form>

      {link && (
        <span className="break-all rounded-lg bg-info-container px-3 py-1.5 text-body-sm text-on-info-container">
          {`${process.env.AUTH_URL || "http://localhost:8080"}/c/${link}`}
        </span>
      )}
    </div>
  );
}
