/** Opções client-safe do módulo Gestão de Empresas (não importa @/db). */

export const TIPOS_DOCUMENTO_EMPRESA = [
  { valor: "seguro_obrigatorio", rotulo: "Seguro obrigatório" },
  { valor: "documentacao_embarcacao", rotulo: "Documentação da embarcação" },
  { valor: "certificado", rotulo: "Certificado" },
  { valor: "licenca", rotulo: "Licença" },
  { valor: "outro", rotulo: "Outros documentos" },
] as const;
