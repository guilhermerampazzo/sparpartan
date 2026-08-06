/**
 * Validação sem dependência nova. O sistema aceitava "abc" como CPF e "ZZ" como UF —
 * o erro só apareceria meses depois, no órgão.
 */

/**
 * `valores` ecoa o que foi digitado de volta para a tela em caso de erro.
 * Necessário porque `<form action>` no React 19 reseta inputs não controlados
 * após a submissão — sem isso, a mensagem de erro aparece mas os campos somem.
 */
export type EstadoForm<T = Record<string, string>> = {
  erro?: string;
  valores?: T;
  /** Mensagem de sucesso/resumo pós-ação (ex.: campanha de e-mail enviada). */
  resumo?: string;
} | null;

export function valoresDoFormData(formData: FormData): Record<string, string> {
  const valores: Record<string, string> = {};
  for (const [chave, valor] of formData.entries()) {
    if (typeof valor === "string") valores[chave] = valor;
  }
  return valores;
}

const UFS = new Set([
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG",
  "PA", "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
]);

export function apenasDigitos(valor: string) {
  return valor.replace(/\D/g, "");
}

export function cpfValido(valor: string) {
  const cpf = apenasDigitos(valor);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false;

  for (const [tamanho, posicaoDv] of [[9, 9], [10, 10]] as const) {
    let soma = 0;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cpf[i]) * (tamanho + 1 - i);
    }
    const resto = (soma * 10) % 11;
    const dv = resto === 10 ? 0 : resto;
    if (dv !== Number(cpf[posicaoDv])) return false;
  }

  return true;
}

export function cnpjValido(valor: string) {
  const cnpj = apenasDigitos(valor);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcularDv = (tamanho: number) => {
    let soma = 0;
    let peso = tamanho - 7;
    for (let i = 0; i < tamanho; i++) {
      soma += Number(cnpj[i]) * peso;
      peso = peso - 1 < 2 ? 9 : peso - 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  return calcularDv(12) === Number(cnpj[12]) && calcularDv(13) === Number(cnpj[13]);
}

export function cpfCnpjValido(valor: string) {
  const digitos = apenasDigitos(valor);
  if (digitos.length === 11) return cpfValido(digitos);
  if (digitos.length === 14) return cnpjValido(digitos);
  return false;
}

export function emailValido(valor: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(valor);
}

export function ufValida(valor: string) {
  return UFS.has(valor.trim().toUpperCase());
}

export function dataNoPassado(valor: string) {
  const data = new Date(valor);
  return !Number.isNaN(data.getTime()) && data <= new Date();
}

/** Coleta erros e devolve a primeira mensagem, no formato que as actions retornam. */
export class Validador {
  private erros: string[] = [];

  exigir(condicao: boolean, mensagem: string) {
    if (!condicao) this.erros.push(mensagem);
    return this;
  }

  /** Só valida se o campo foi preenchido — campos opcionais não devem barrar o envio. */
  sePreenchido(valor: string, condicao: (v: string) => boolean, mensagem: string) {
    if (valor.trim() && !condicao(valor)) this.erros.push(mensagem);
    return this;
  }

  get erro(): string | undefined {
    return this.erros[0];
  }
}
