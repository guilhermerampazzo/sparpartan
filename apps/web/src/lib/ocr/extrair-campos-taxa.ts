/**
 * Heurísticas sobre o texto de boletos/guias de taxa (Marinha, GRU, DARF etc.).
 * Funciona tanto com o texto extraído direto do PDF (camada de texto do pdfjs)
 * quanto com o texto do Tesseract (scan). Cada regex é tolerante a variações de
 * layout e nunca lança erro — só retorna o que conseguir reconhecer, deixando o
 * resto para preenchimento manual.
 */
export type CamposExtraidosTaxa = {
  cpfCnpj?: string;
  nomeCliente?: string;
  numero?: string;
  validade?: string;
  servicoNome?: string;
  valor?: string;
  /** Indícios de que o documento já foi pago (comprovante/quitação). */
  paga?: boolean;
};

import { cpfValido, cnpjValido } from "../validacao";

function normalizar(texto: string) {
  return texto.replace(/\r/g, "").replace(/[ \t]+/g, " ");
}

/**
 * O número da GRU/DARF é só dígitos e tem o mesmo tamanho de um CPF — um match
 * ingênuo pega um pedaço dele. A delimitação por `(?<!\d)...(?!\d)` + validação
 * dos dígitos verificadores elimina o falso positivo.
 */
function extrairCpf(texto: string): string | undefined {
  const match = texto.match(/(?<!\d)\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d)/);
  if (!match) return undefined;
  const digitos = match[0].replace(/\D/g, "");
  if (digitos.length !== 11 || !cpfValido(digitos)) return undefined;
  return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}

function extrairCnpj(texto: string): string | undefined {
  const match = texto.match(/(?<!\d)\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}(?!\d)/);
  if (!match) return undefined;
  const digitos = match[0].replace(/\D/g, "");
  if (digitos.length !== 14 || !cnpjValido(digitos)) return undefined;
  return `${digitos.slice(0, 2)}.${digitos.slice(2, 5)}.${digitos.slice(5, 8)}/${digitos.slice(8, 12)}-${digitos.slice(12)}`;
}

/**
 * GRU mascarada o nome (ex.: "COMERCIAL R*** P*** L***") — o `*` é parte do nome.
 * A correspondência com o cadastro acontece pelo CPF/CNPJ, que sai completo.
 */
function extrairNomeCliente(texto: string): string | undefined {
  const rotulo = texto.match(
    /(?:CONTRIBUINTE|REQUERENTE|PROPRIET[ÁA]RIO|SACADO|NOME)[^\S\r\n]*[:\-]?[^\S\r\n]*\n?[^\S\r\n]*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú\s\*]{5,60})/
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

/**
 * Prefere a data logo após o rótulo "Vencimento" — a GRU traz primeiro a data do
 * documento e só depois a do vencimento, então dentro da janela fica a última.
 * Sem o rótulo, usa a data mais recente do texto.
 */
function extrairValidade(texto: string): string | undefined {
  const coletar = (bloco: string) => {
    const datas: string[] = [];
    const re = /(\d{2})[.\/](\d{2})[.\/](\d{4})/g;
    let m: RegExpExecArray | null;
    while ((m = re.exec(bloco)) !== null) datas.push(`${m[3]}-${m[2]}-${m[1]}`);
    return datas;
  };
  const plausivel = (iso: string) => {
    const ano = Number(iso.slice(0, 4));
    return ano >= new Date().getFullYear() - 1 && ano <= new Date().getFullYear() + 10;
  };

  const idx = texto.search(/VENCIMENTO/i);
  if (idx !== -1) {
    const datas = coletar(texto.slice(idx, idx + 200)).filter(plausivel);
    if (datas.length > 0) return datas[datas.length - 1];
  }

  const todas = coletar(texto).filter(plausivel);
  if (todas.length === 0) return undefined;
  return todas.sort()[todas.length - 1];
}

type ServicoEncontrado = { nome: string; indice: number };

function casarServico(texto: string): ServicoEncontrado | undefined {
  const regexes = [
    // GRU: a descrição vem após os cabeçalhos das colunas, antes de "qtd valor valor".
    /(?:VALOR\s+TOTAL\s+R\$\s*|DESCRI[ÇC][ÃA]O\s+)([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú0-9\s()\/\-\.\,\"\']{8,200}?)(?=\s+\d+\s+\d{1,3}(?:\.\d{3})*,\d{2}|\s+R\$\s+\d{1,3}(?:\.\d{3})*,\d{2}|\s*$)/i,
    // Genérico: rótulo SERVIÇO/DISCRIMINAÇÃO/DESCRIÇÃO seguido do texto.
    /(?:SERVI[ÇC]O|DISCRIMINA[ÇC][ÃA]O|DESCRI[ÇC][ÃA]O)[^\S\r\n]*[:\-]?[^\S\r\n]*([A-ZÀ-Ú][A-ZÀ-Úa-zà-ú0-9\s()\/\-\.\,\"\']{5,160})/i,
  ];
  for (const re of regexes) {
    const m = re.exec(texto);
    if (m && m[1] && m.index >= 0) {
      return { nome: m[1].trim(), indice: m.index + m[0].length };
    }
  }
  return undefined;
}

function extrairServicoNome(texto: string): string | undefined {
  return casarServico(texto)?.nome;
}

/**
 * Valor da taxa. Procura primeiro na janela logo após a descrição do serviço
 * (onde a GRU imprime "qtd valor unitário valor total"), depois qualquer
 * "R$ valor" do texto.
 */
function extrairValor(texto: string): string | undefined {
  const moeda = /\d{1,3}(?:\.\d{3})*,\d{2}/;
  const servico = casarServico(texto);
  const janela = servico ? texto.slice(servico.indice, servico.indice + 260) : texto;

  const comSimbolo = janela.match(new RegExp(`R\\$\\s*(${moeda.source})`, "i"));
  if (comSimbolo) return comSimbolo[1];

  const tripla = janela.match(new RegExp(`\\b\\d+\\s+(${moeda.source})\\s+(${moeda.source})\\b`));
  if (tripla) return tripla[2];

  const fallback = texto.match(new RegExp(`R\\$\\s*(${moeda.source})`, "i"));
  return fallback?.[1];
}

/** Comprovantes costumam carimbar/imprimir a quitação — evita confundir com o boleto. */
function extrairPaga(texto: string): boolean {
  return /(?:COMPROVANTE\s*(?:DE\s*)?(?:PAGAMENTO|PAGTO)|PAGAMENTO\s*(?:REALIZADO|EFETUADO|CONFIRMADO)|TAXA\s*PAGA|GUIA\s*PAGA|QUITAD[OA]|PAGO\s*(?:EM|NO|R\$)|PAGAMENTO\s*OK)/i.test(
    texto
  );
}

export function extrairCamposTaxa(textoOcr: string): CamposExtraidosTaxa {
  const texto = normalizar(textoOcr);

  return {
    cpfCnpj: extrairCpf(texto) ?? extrairCnpj(texto),
    nomeCliente: extrairNomeCliente(texto),
    numero: extrairNumero(texto),
    validade: extrairValidade(texto),
    servicoNome: extrairServicoNome(texto),
    valor: extrairValor(texto),
    paga: extrairPaga(texto),
  };
}
