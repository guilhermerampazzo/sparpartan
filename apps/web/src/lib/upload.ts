const MAX_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB

const EXTENSOES_PERMITIDAS = new Set([
  ".pdf",
  ".doc",
  ".docx",
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
  ".heic",
]);

export type CategoriaArquivo = "documento" | "imagem" | "video";

type RegraCategoria = {
  extensoes: Set<string>;
  maxBytes: number;
  mensagemTipo: string;
};

const REGRAS_POR_CATEGORIA: Record<CategoriaArquivo, RegraCategoria> = {
  documento: {
    extensoes: EXTENSOES_PERMITIDAS,
    maxBytes: MAX_UPLOAD_BYTES,
    mensagemTipo: "Tipo de arquivo não permitido. Use PDF, Word ou imagem.",
  },
  imagem: {
    extensoes: new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]),
    maxBytes: 10 * 1024 * 1024, // 10 MB
    mensagemTipo: "Tipo de arquivo não permitido. Use JPG, PNG, WEBP ou GIF.",
  },
  video: {
    extensoes: new Set([".mp4", ".webm", ".mov"]),
    maxBytes: 500 * 1024 * 1024, // 500 MB
    mensagemTipo: "Tipo de arquivo não permitido. Use MP4, WEBM ou MOV.",
  },
};

/**
 * Nenhum ponto de upload (cliente interno, link público, comprovante de protocolo)
 * limitava tamanho ou tipo — um arquivo de qualquer tamanho ou extensão passava.
 *
 * `categoria` seleciona a whitelist de extensões e o limite de tamanho a aplicar.
 * O padrão ("documento") preserva o comportamento original para chamadas existentes.
 */
export function validarArquivo(
  arquivo: File,
  categoria: CategoriaArquivo = "documento"
): string | null {
  const regra = REGRAS_POR_CATEGORIA[categoria];

  if (arquivo.size === 0) return "Arquivo vazio.";
  if (arquivo.size > regra.maxBytes) {
    return `Arquivo muito grande (máx. ${regra.maxBytes / 1024 / 1024} MB).`;
  }

  const nome = arquivo.name.toLowerCase();
  const extensao = nome.slice(nome.lastIndexOf("."));
  if (!regra.extensoes.has(extensao)) {
    return regra.mensagemTipo;
  }

  return null;
}

const MIME_POR_EXTENSAO: Record<string, string> = {
  ".pdf": "application/pdf",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".heic": "image/heic",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
};

/** Usado para servir arquivos com preview inline no navegador (`Content-Type` correto). */
export function mimeTypePorExtensao(nomeArquivo: string): string {
  const nome = nomeArquivo.toLowerCase();
  const extensao = nome.slice(nome.lastIndexOf("."));
  return MIME_POR_EXTENSAO[extensao] ?? "application/octet-stream";
}
