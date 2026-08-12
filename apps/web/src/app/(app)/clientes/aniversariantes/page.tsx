import { sql, eq, and, gte } from "drizzle-orm";
import { Cake, CheckCircle2 } from "lucide-react";
import { db } from "@/db";
import { clientes, enviosEmail } from "@/db/schema";
import { LinkButton, EmptyState, DataTable, Badge, Button, type Column, BackButton } from "@/components/ui";
import { enviarParabens } from "./actions";

type LinhaAniversariante = {
  id: string;
  nome: string;
  dataNascimento: string | null;
  celular: string | null;
  telefone: string | null;
  email: string | null;
};

function formatarDiaMes(data: string) {
  const [, mes, dia] = data.split("-").map(Number);
  const nomesMes = [
    "jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez",
  ];
  return `${dia} de ${nomesMes[mes - 1]}`;
}

function calcularIdade(data: string) {
  const [ano, mes, dia] = data.split("-").map(Number);
  const hoje = new Date();
  let idade = hoje.getFullYear() - ano;
  const aindaNaoFezAniversario =
    hoje.getMonth() + 1 < mes || (hoje.getMonth() + 1 === mes && hoje.getDate() < dia);
  if (aindaNaoFezAniversario) idade--;
  return idade;
}

function ehHoje(data: string) {
  const hoje = new Date();
  const [, mes, dia] = data.split("-").map(Number);
  return hoje.getMonth() + 1 === mes && hoje.getDate() === dia;
}

export default async function AniversariantesPage() {
  const lista = await db
    .select({
      id: clientes.id,
      nome: clientes.nome,
      dataNascimento: clientes.dataNascimento,
      celular: clientes.celular,
      telefone: clientes.telefone,
      email: clientes.email,
    })
    .from(clientes)
    .where(
      sql`${clientes.dataNascimento} is not null and extract(month from ${clientes.dataNascimento}) = extract(month from current_date)`
    )
    .orderBy(sql`extract(day from ${clientes.dataNascimento})`);

  const inicioHoje = new Date();
  inicioHoje.setHours(0, 0, 0, 0);
  const enviadosHoje = await db
    .select({ clienteId: enviosEmail.clienteId })
    .from(enviosEmail)
    .where(
      and(
        eq(enviosEmail.status, "enviado"),
        gte(enviosEmail.criadoEm, inicioHoje),
        sql`${enviosEmail.assunto} ilike '%aniversário%'`
      )
    );
  const idsEnviados = new Set(enviadosHoje.map((e) => e.clienteId));

  const columns: Column<LinhaAniversariante>[] = [
    { header: "Nome", cell: (c) => <span className="font-medium text-primary">{c.nome}</span> },
    {
      header: "Aniversário",
      cell: (c) =>
        c.dataNascimento ? (
          <span className="inline-flex items-center gap-2">
            {formatarDiaMes(c.dataNascimento)} ({calcularIdade(c.dataNascimento)} anos)
            {ehHoje(c.dataNascimento) && (
              <Badge tone="warning" size="sm">
                Hoje!
              </Badge>
            )}
          </span>
        ) : (
          "—"
        ),
    },
    { header: "Contato", cell: (c) => c.celular ?? c.telefone ?? "—" },
    {
      header: "",
      align: "right",
      cell: (c) => {
        if (!c.email) return <span className="text-body-sm text-outline">sem e-mail</span>;
        if (idsEnviados.has(c.id)) {
          return (
            <Badge tone="success" icon={CheckCircle2} size="sm">
              Enviado hoje
            </Badge>
          );
        }
        const enviarComId = enviarParabens.bind(null, c.id);
        return (
          <form action={enviarComId}>
            <Button type="submit" variant="outlined" size="sm">
              Enviar Parabéns
            </Button>
          </form>
        );
      },
    },
  ];

  return (
    <div className="space-y-gutter">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-headline-lg font-bold text-primary">
          Aniversariantes do Mês
        </h1>
        <BackButton href="/clientes" />
      </div>

      <DataTable
        columns={columns}
        rows={lista}
        rowKey={(c) => c.id}
        empty={<EmptyState icon={Cake} title="Nenhum aniversariante este mês" />}
      />
    </div>
  );
}
