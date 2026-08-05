/**
 * Renderiza a primeira página de um PDF em um canvas, para depois passar pro
 * Tesseract.js (que só entende imagem, não PDF). Roda 100% no navegador.
 */
export async function primeiraPaginaComoCanvas(arquivo: File): Promise<HTMLCanvasElement> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buffer = await arquivo.arrayBuffer();
  const documento = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pagina = await documento.getPage(1);
  const viewport = pagina.getViewport({ scale: 2 });

  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const contexto = canvas.getContext("2d");
  if (!contexto) throw new Error("Não foi possível preparar a página para leitura.");

  await pagina.render({ canvas, canvasContext: contexto, viewport }).promise;
  return canvas;
}

/**
 * Lê a camada de texto de um PDF digital (GRU, boleto, DARF gerados por sistema).
 * Para documentos digitais isso é muito mais preciso que OCR — o texto sai idêntico
 * ao original. Pode lançar para PDFs escaneados (sem camada de texto); quem chama
 * deve cair para o OCR nessas horas.
 */
export async function textoDaPrimeiraPagina(arquivo: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buffer = await arquivo.arrayBuffer();
  const documento = await pdfjsLib.getDocument({ data: buffer }).promise;
  const pagina = await documento.getPage(1);
  const conteudo = await pagina.getTextContent();
  return conteudo.items.map((item) => ("str" in item ? item.str : "")).join(" ");
}

/**
 * Igual a `primeiraPaginaComoCanvas`, mas renderiza todas as páginas do PDF
 * (até `maxPaginas`), para leitura de documentos completos via OCR.
 */
export async function todasPaginasComoCanvas(
  arquivo: File,
  maxPaginas = 15
): Promise<HTMLCanvasElement[]> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const buffer = await arquivo.arrayBuffer();
  const documento = await pdfjsLib.getDocument({ data: buffer }).promise;
  const totalPaginas = Math.min(documento.numPages, maxPaginas);

  const canvases: HTMLCanvasElement[] = [];
  for (let i = 1; i <= totalPaginas; i++) {
    const pagina = await documento.getPage(i);
    const viewport = pagina.getViewport({ scale: 2 });

    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const contexto = canvas.getContext("2d");
    if (!contexto) throw new Error("Não foi possível preparar a página para leitura.");

    await pagina.render({ canvas, canvasContext: contexto, viewport }).promise;
    canvases.push(canvas);
  }

  return canvases;
}
