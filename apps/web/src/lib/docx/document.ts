import JSZip from "jszip";
import { extractMergeFields, fillMergeFields } from "./merge-fields";

const DOCUMENT_XML_PATH = "word/document.xml";
const SETTINGS_XML_PATH = "word/settings.xml";

/** Largura máxima de exibição das fotos no documento: 15 cm em EMU (1 cm = 360.000). */
const MAX_LARGURA_EMU = 15 * 360000;

export type ImagemDocx = { buffer: Buffer; extensao: string };

export async function extractFieldsFromDocx(buffer: Buffer): Promise<string[]> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file(DOCUMENT_XML_PATH)?.async("string");
  if (!documentXml) throw new Error("word/document.xml não encontrado no .docx");
  return extractMergeFields(documentXml);
}

/**
 * Alguns modelos (ex.: NORMAM-202) foram criados com o recurso de Mala Direta do
 * Word, apontando para uma planilha Excel que só existia no computador de quem
 * criou o modelo (`word/settings.xml` guarda um `<w:mailMerge>` com o caminho
 * absoluto da planilha). Como só reescrevemos `document.xml` — os MERGEFIELDs já
 * viram texto estático — esse bloco de mala direta fica órfão, mas ainda marca o
 * documento como "mainDocumentType=formLetters" ligado a uma fonte de dados
 * inexistente. O LibreOffice (usado pelo Gotenberg para converter para PDF) tenta
 * processar essa mala direta ao abrir o arquivo e, sem conseguir achar a planilha,
 * pode renderizar seções do documento em branco. Removendo o bloco, o documento
 * volta a ser tratado como um .docx normal na conversão.
 */
function removerMalaDireta(settingsXml: string): string {
  return settingsXml.replace(/<w:mailMerge>[\s\S]*?<\/w:mailMerge>/, "");
}

/** Lê as dimensões de PNG/JPEG direto do header — sem dependência de lib extra. */
function dimensoesImagem(buffer: Buffer): { width: number; height: number } | null {
  if (buffer.length > 24 && buffer.toString("ascii", 1, 4) === "PNG") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  }
  if (buffer.length > 2 && buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset + 9 < buffer.length) {
      if (buffer[offset] !== 0xff) {
        offset++;
        continue;
      }
      const marcador = buffer[offset + 1];
      if (marcador === 0xd8 || (marcador >= 0xd0 && marcador <= 0xd7)) {
        offset += 2;
        continue;
      }
      const comprimento = buffer.readUInt16BE(offset + 2);
      if (
        marcador >= 0xc0 &&
        marcador <= 0xcf &&
        marcador !== 0xc4 &&
        marcador !== 0xc8 &&
        marcador !== 0xcc
      ) {
        return { width: buffer.readUInt16BE(offset + 7), height: buffer.readUInt16BE(offset + 5) };
      }
      offset += 2 + comprimento;
    }
  }
  return null;
}

/** Gera os parágrafos com as fotos (título + uma imagem por parágrafo, centralizada). */
function paragrafosDeImagens(imagens: ImagemDocx[], rid: (i: number) => string): string {
  let xml =
    `<w:p><w:pPr><w:spacing w:before="360" w:after="120"/><w:jc w:val="center"/>` +
    `<w:rPr><w:b/><w:sz w:val="22"/></w:rPr></w:pPr>` +
    `<w:r><w:rPr><w:b/><w:sz w:val="22"/></w:rPr><w:t>FOTOS DA OBRA</w:t></w:r></w:p>`;

  imagens.forEach((img, i) => {
    const dims = dimensoesImagem(img.buffer) ?? { width: 800, height: 600 };
    let cx = dims.width * 9525;
    let cy = dims.height * 9525;
    if (cx > MAX_LARGURA_EMU) {
      const fator = MAX_LARGURA_EMU / cx;
      cx = Math.round(cx * fator);
      cy = Math.round(cy * fator);
    }
    const id = 1000 + i;
    const embed = rid(i);
    xml +=
      `<w:p><w:pPr><w:spacing w:before="120" w:after="240"/><w:jc w:val="center"/></w:pPr>` +
      `<w:r><w:drawing>` +
      `<wp:inline distT="0" distB="0" distL="0" distR="0">` +
      `<wp:extent cx="${cx}" cy="${cy}"/>` +
      `<wp:effectExtent l="0" t="0" r="0" b="0"/>` +
      `<wp:docPr id="${id}" name="Foto ${i + 1}"/>` +
      `<wp:cNvGraphicFramePr><a:graphicFrameLocks noChangeAspect="1"/></wp:cNvGraphicFramePr>` +
      `<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/picture">` +
      `<pic:pic><pic:nvPicPr><pic:cNvPr id="${id}" name="Foto ${i + 1}"/><pic:cNvPicPr/></pic:nvPicPr>` +
      `<pic:blipFill><a:blip r:embed="${embed}"/><a:stretch><a:fillRect/></a:stretch></pic:blipFill>` +
      `<pic:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${cx}" cy="${cy}"/></a:xfrm>` +
      `<a:prstGeom prst="rect"><a:avLst/></a:prstGeom></pic:spPr>` +
      `</pic:pic></a:graphicData></a:graphic>` +
      `</wp:inline></w:drawing></w:r></w:p>`;
  });

  return xml;
}

/**
 * Insere as imagens no corpo do documento, logo antes da última tabela — no
 * Memorial Descritivo a última tabela é a de assinaturas, então as fotos ficam
 * "antes das assinaturas", como pedido. Registra cada imagem no pacote
 * (`word/media/`) e no `.rels` do documento.
 */
async function inserirImagens(
  zip: JSZip,
  documentXml: string,
  imagens: ImagemDocx[]
): Promise<string> {
  const inserir = paragrafosDeImagens(imagens, (i) => `rIdFoto${i}`);

  const tabelas = [...documentXml.matchAll(/<w:tbl(?=[\s>])/g)];
  const ultimaTabela = tabelas.length > 0 ? tabelas[tabelas.length - 1].index : -1;
  const finalXml =
    ultimaTabela >= 0
      ? documentXml.slice(0, ultimaTabela) + inserir + documentXml.slice(ultimaTabela)
      : documentXml + inserir;

  imagens.forEach((img, i) => {
    zip.file(`word/media/obra-foto-${i}.${img.extensao}`, img.buffer);
  });

  const relsPath = "word/_rels/document.xml.rels";
  const relsXml = await zip.file(relsPath)?.async("string");
  if (relsXml) {
    const novas = imagens
      .map(
        (img, i) =>
          `<Relationship Id="rIdFoto${i}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/obra-foto-${i}.${img.extensao}"/>`
      )
      .join("");
    zip.file(relsPath, relsXml.replace("</Relationships>", novas + "</Relationships>"));
  }

  return finalXml;
}

export async function renderDocx(
  buffer: Buffer,
  values: Record<string, string>,
  opcoes?: { imagens?: ImagemDocx[] }
): Promise<Buffer> {
  const zip = await JSZip.loadAsync(buffer);
  const documentXml = await zip.file(DOCUMENT_XML_PATH)?.async("string");
  if (!documentXml) throw new Error("word/document.xml não encontrado no .docx");

  const imagens = opcoes?.imagens ?? [];
  const filledXml = fillMergeFields(documentXml, values);
  const finalXml =
    imagens.length > 0 ? await inserirImagens(zip, filledXml, imagens) : filledXml;
  zip.file(DOCUMENT_XML_PATH, finalXml);

  const settingsXml = await zip.file(SETTINGS_XML_PATH)?.async("string");
  if (settingsXml?.includes("<w:mailMerge>")) {
    zip.file(SETTINGS_XML_PATH, removerMalaDireta(settingsXml));
  }

  return zip.generateAsync({ type: "nodebuffer" });
}
