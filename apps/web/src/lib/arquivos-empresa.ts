/**
 * Categorias do repositório interno (Documentos Sparapan). O cliente pediu que
 * seja o lugar para guardar TUDO que importa para a empresa, com módulos para
 * cada tipo de documento.
 */
export const ARQUIVOS_EMPRESA_CATEGORIAS = [
  { value: "nota_fiscal", label: "Notas Fiscais" },
  { value: "empresa", label: "Documentos da Empresa" },
  { value: "colaborador", label: "Colaboradores" },
  { value: "contrato", label: "Contratos Assinados" },
  { value: "terceirizacao", label: "Terceirizações" },
  { value: "seguro", label: "Seguros" },
  { value: "embarcacao", label: "Dados de Embarcação" },
  { value: "memorial", label: "Memorial/Fluxograma de Processo" },
  { value: "outro", label: "Outros" },
] as const;

export function rotuloCategoriaArquivoEmpresa(valor: string): string {
  return (
    ARQUIVOS_EMPRESA_CATEGORIAS.find((c) => c.value === valor)?.label ?? valor
  );
}
