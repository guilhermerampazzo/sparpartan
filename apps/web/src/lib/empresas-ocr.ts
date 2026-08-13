/** Heurísticas para leitura de documentos de empresa (seguro, certificado, licença...). */

export type CamposDocumentoEmpresa = {
  cnpj?: string;
  numero?: string;
  dataEmissao?: string;
  dataVencimento?: string;
  tipoSugerido?: string;
};

function normalizar(texto: string) {
  return texto.replace(/\r/g, "").replace(/[ \t]+/g, " ");
}

export function extrairCnpjDocumento(texto: string): string | undefined {
  const match = texto.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  if (!match) return undefined;
  const digitos = match[0].replace(/\D/g, "");
  if (digitos.length !== 14) return undefined;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}

function extrairNumero(texto: string): string | undefined {
  const match = texto.match(
    /(?:N[ºo]?\.?\s*(?:DO\s*)?(?:CERTIFICADO|SEGURO|DOCUMENTO|APOLICE)|NUMERO|NÚMERO)(?:\s+DA\s+APOLICE\s*:?\s*|\s+DO\s+(?:CERTIFICADO|SEGURO|DOCUMENTO)\s*:?\s*)?[:.\s-]*([A-Za-z0-9./-]{4,30})/i
  );
  if (!match) return undefined;
  const valor = match[1].trim();
  return /^[0-9]{4,}$/.test(valor) || /[A-Za-z]/.test(valor) ? valor : undefined;
}

function extrairData(texto: string, rotulos: RegExp): string | undefined {
  const match = texto.match(new RegExp(`${rotulos.source}[^0-9]{0,15}(\\d{2})[./-](\\d{2})[./-](\\d{4})`, "i"));
  if (!match) return undefined;
  const [, dia, mes, ano] = match;
  const anoNum = Number(ano);
  if (anoNum < 2000 || anoNum > 2100) return undefined;
  return `${ano}-${mes}-${dia}`;
}

function sugerirTipo(texto: string): string | undefined {
  const t = texto.toUpperCase();
  if (/SEGURO|APOLICE|VIGENCIA/i.test(t)) return "seguro_obrigatorio";
  if (/CERTIFICADO/i.test(t)) return "certificado";
  if (/LICENÇA|LICENCA/i.test(t)) return "licenca";
  if (/INSCRIÇÃO|INSCRICAO|EMBARCACAO|EMBARCAÇÃO/i.test(t)) return "documentacao_embarcacao";
  return undefined;
}

export function extrairCamposDocumentoEmpresa(textoOcr: string): CamposDocumentoEmpresa {
  const texto = normalizar(textoOcr);
  return {
    cnpj: extrairCnpjDocumento(texto),
    numero: extrairNumero(texto),
    dataEmissao: extrairData(texto, /(?:EMISS[AÃ]O|EMISSAO|DATA\s*DE\s*EMISSAO)/),
    dataVencimento: extrairData(texto, /(?:VENCIMENTO|VALIDADE|VALIDA ATE|VIGENCIA|VIGÊNCIA)/),
    tipoSugerido: sugerirTipo(texto),
  };
}
