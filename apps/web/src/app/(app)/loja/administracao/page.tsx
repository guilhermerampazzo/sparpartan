import { Trash2 } from "lucide-react";
import { db } from "@/db";
import { lojaFabricantes, lojaFornecedores, lojaTransportadoras } from "@/db/schema";
import { SectionCard, Campo } from "@/components/ui/form-field";
import { Button, ConfirmButton, BackButton } from "@/components/ui";
import { criarItemAdministracaoLoja, excluirItemAdministracaoLoja } from "./actions";

export default async function AdministracaoLojaPage() {
  const [fabricantes, fornecedores, transportadoras] = await Promise.all([
    db.select().from(lojaFabricantes).orderBy(lojaFabricantes.nome),
    db.select().from(lojaFornecedores).orderBy(lojaFornecedores.nome),
    db.select().from(lojaTransportadoras).orderBy(lojaTransportadoras.nome),
  ]);

  const secoes = [
    { titulo: "Fabricantes", tipo: "fabricantes" as const, itens: fabricantes },
    { titulo: "Fornecedores", tipo: "fornecedores" as const, itens: fornecedores },
    { titulo: "Transportadoras", tipo: "transportadoras" as const, itens: transportadoras },
  ];

  return (
    <div className="space-y-gutter">
      <BackButton href="/loja" />
      <div>
        <h1 className="font-display text-headline-lg font-bold text-primary">Administração da Loja</h1>
        <p className="text-body-sm text-outline">Cadastros de apoio usados no catálogo e nas vendas da loja.</p>
      </div>

      <div className="grid grid-cols-1 gap-gutter lg:grid-cols-3">
        {secoes.map((secao) => {
          const criarComTipo = criarItemAdministracaoLoja.bind(null, secao.tipo);
          return (
            <SectionCard key={secao.tipo} title={secao.titulo}>
              {secao.itens.length > 0 ? (
                <ul className="mb-4 divide-y divide-outline-variant">
                  {secao.itens.map((item) => {
                    const excluirComId = excluirItemAdministracaoLoja.bind(null, secao.tipo, item.id);
                    return (
                      <li key={item.id} className="flex items-center justify-between py-2">
                        <span className="text-body-sm text-primary">{item.nome}</span>
                        <form action={excluirComId}>
                          <ConfirmButton
                            mensagem={`Excluir "${item.nome}"?`}
                            variant="text"
                            icon={<Trash2 size={12} />}
                          >
                            Excluir
                          </ConfirmButton>
                        </form>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mb-4 text-body-sm text-outline">Nenhum cadastro ainda.</p>
              )}
              <form action={criarComTipo} className="flex items-end gap-2">
                <Campo label="Nome" name="nome" required />
                <Button type="submit" variant="outlined" size="sm">
                  Adicionar
                </Button>
              </form>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}
