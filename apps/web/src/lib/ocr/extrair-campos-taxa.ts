/**
 * Heurísticas sobre o texto OCR de boletos/guias de taxa (Marinha, GRU, DARF etc.).
 * Cada regex é tolerante a variações de layout e nunca lança erro — só retorna o
 * que conseguir reconhecer, deixando o resto para preenchimento manual.
 */
export type CamposExtraidosTaxa = {
  cpfCnpj?: string;
  nomeCliente?: string;
  numero?: string;
  validade?: string;
  servicoNome?: string;
};

function normalizar(texto: string) {
  return texto.replace(/\r/g, "").replace(/[ \t]+/g, " ");
}

function extrairCpf(texto: string): string | undefined {
  const match = texto.match(/\d{3}\.?\d{3}\.?\d{3}-?\d{2}/);
  if (!match) return undefined;
  const digitos = match[0].replace(/\D/g, "");
  if (digitos.length !== 11) return undefined;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function extrairCnpj(texto: string): string | undefined {
  const match = texto.match(/\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}/);
  if (!match) return undefined;
  const digitos = match[0].replace(/\D/g, "");
  if (digitos.length !== 14) return undefined;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}

function extrairNomeCliente(texto: string): string | undefined {
  const rotulo = texto.match(
    /(?:CONTRIBUINTE|REQUERENTE|PROPRIET[ÁA]RIO|SACADO|NOME)[^\S\r\n]*[:\-]?[^\S\r\n]*\n?[^\S\r\n]*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s]{5,60})/
  );
  if (!rotulo) return undefined;
  const nome = rotulo[1].trim().replace(/\s{2,}/g, " ");
  if (nome.length < 5) return undefined;
  return nome;
}

function extrairNumero(texto: string): string | undefined {
  const rotulo = texto.match(
    /(?:N[ÚU]MERO\s*(?:DA\s*)?(?:GUIA|GRU|DARF)?|GUIA|DARF|GRU|NOSSO\s*N[ÚU]MERO|N[º°.]?\s*(?:DA\s*)?GUIA)[^\d]{0,10}([\d][\d.\-\/]{5,25}\d)/i
  );
  if (rotulo) return rotulo[1].trim();
  return undefined;
}

function extrairValidade(texto: string): string | undefined {
  const rotulo = texto.match(
    /(?:VALIDADE|V[ÁA]LIDO\s*AT[ÉE]|VENCIMENTO)[^\d]{0,15}(\d{2})[./-](\d{2})[./-](\d{4})/i
  );
  if (!rotulo) return undefined;
  const [, dia, mes, ano] = rotulo;
  const anoNum = Number(ano);
  if (anoNum < new Date().getFullYear() - 1 || anoNum > new Date().getFullYear() + 10) return undefined;
  return `${ano}-${mes}-${dia}`;
}

function extrairServicoNome(texto: string): string | undefined {
  const rotulo = texto.match(/(?:SERVI[ÇC]O|DISCRIMINA[ÇC][ÃA]O|DESCRI[ÇC][ÃA]O)[^\S\r\n]*[:\-]?[^\S\r\n]*([^\n]{5,80})/i);
  if (!rotulo) return undefined;
  return rotulo[1].trim();
}

export function extrairCamposTaxa(textoOcr: string): CamposExtraidosTaxa {
  const texto = normalizar(textoOcr);

  return {
    cpfCnpj: extrairCpf(texto) ?? extrairCnpj(texto),
    nomeCliente: extrairNomeCliente(texto),
    numero: extrairNumero(texto),
    validade: extrairValidade(texto),
    servicoNome: extrairServicoNome(texto),
  };
}
