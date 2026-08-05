import type {
  clientes,
  embarcacoes,
  motores,
  aquisicoes,
  habilitacoes,
  obras,
  engenheiros,
} from "@/db/schema";

type Cliente = typeof clientes.$inferSelect;
type Embarcacao = typeof embarcacoes.$inferSelect;
type Motor = typeof motores.$inferSelect;
type Aquisicao = typeof aquisicoes.$inferSelect;
type Habilitacao = typeof habilitacoes.$inferSelect;
type Obra = typeof obras.$inferSelect;
type Engenheiro = typeof engenheiros.$inferSelect;

function s(value: string | number | null | undefined): string {
  return value === null || value === undefined ? "" : String(value);
}

/**
 * Mapeamento de todos os campos MERGEFIELD encontrados nos 7 fluxos de documentos/
 * (embarcação, embarcação comercial x2, jetski, arrais, motonauta, CIR) para as
 * nossas tabelas. Levantado varrendo os .docx reais campo a campo — cobre a união
 * de nomes usados entre os modelos, incluindo variantes (CEL/CELULAR, NACIO/
 * NACIONALIDADE, etc.) porque cada modelo da Marinha nomeia os campos de um jeito
 * ligeiramente diferente mesmo pedindo o mesmo dado.
 *
 * Cobre também os ~50 campos técnicos do Memorial Descritivo / Requerimento
 * NORMAM-303 (preenchimento de obras) via a tabela `obras` — trapiches,
 * flutuantes e marinas não são embarcação nem cliente, por isso têm entidade
 * própria.
 */
export function resolverCamposConhecidos(context: {
  cliente?: Cliente;
  embarcacao?: Embarcacao;
  motores?: Motor[];
  aquisicao?: Aquisicao;
  habilitacoes?: Habilitacao[];
  obra?: Obra;
  engenheiro?: Engenheiro;
  camposMarcacao?: { campo: string; valorMarcado: string; servicoIds: string[] }[];
  servicoId?: string | null;
}): Record<string, string> {
  const { cliente, embarcacao, aquisicao, obra, engenheiro } = context;
  const motores = context.motores ?? [];
  const motorPrincipal = motores[0];
  const habilitacoes = [...(context.habilitacoes ?? [])].sort(
    (a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()
  );
  // Quando o cliente tem mais de uma habilitação do mesmo tipo (ex: CHA renovada),
  // usa a mais recente — a lista já está ordenada por criadoEm desc acima.
  const habilitacaoCha = habilitacoes.find((h) => h.tipo === "CHA");
  const habilitacaoCir = habilitacoes.find((h) => h.tipo === "CIR");

  const valores: Record<string, string> = {};

  if (cliente) {
    const nome = s(cliente.nome);
    const cpfCnpj = s(cliente.cpfCnpj);
    const rg = s(cliente.rg);
    const orgaoEmissor = s(cliente.orgaoEmissor);
    const dataEmissaoRg = s(cliente.dataEmissaoRg);
    const nacionalidade = s(cliente.nacionalidade);
    const naturalidade = s(cliente.naturalidade);
    const telefone = s(cliente.telefone);
    const celular = s(cliente.celular);
    const email = s(cliente.email);
    const cep = s(cliente.cep);
    const bairro = s(cliente.bairro);
    const cidade = s(cliente.cidade);
    const uf = s(cliente.uf);
    const complemento = s(cliente.complemento);
    const rua = s(cliente.rua);
    const numero = s(cliente.numero);
    const enderecoComNumero = [rua, numero].filter(Boolean).join(", ");

    // NOME_ (com underscore) é o mesmo dado em NORMAM 303 — a Marinha só nomeia diferente.
    valores.NOME = nome;
    valores["NOME_"] = nome;
    valores.CPFCNPJ = cpfCnpj;
    valores.RG = rg;
    valores.RG_IDENTIDADE = rg;
    valores["ORGÃO_EMISSOR"] = orgaoEmissor;
    valores["DATA_DE_EMISSÃO"] = dataEmissaoRg;
    valores.NACIONALIDADE = nacionalidade;
    valores.NACIO = nacionalidade;
    valores.NATURALIDADE = naturalidade;
    valores.NATUR = naturalidade;
    valores.TEL = telefone;
    valores.TELEFONE = telefone;
    valores.CEL = celular;
    valores.CELULAR = celular;
    valores.EMAIL = email;
    valores.CEP = cep;
    valores.BAIRRO = bairro;
    valores.CIDADE = cidade;
    valores.CIDADEUF = [cidade, uf].filter(Boolean).join("/");
    valores.UF = uf;
    valores.ESTADO = uf;
    valores.COMPLEMENTO = complemento;
    // Os formulários da Marinha separam o endereço do número em campos distintos
    // ("Endereço: ..., Nº [N] — Bairro ..."). Preencher N evita o "Rua A, 100, , Centro".
    valores["ENDEREÇO_N"] = rua;
    valores["ENDEREÇO_2"] = rua;
    valores["ENDEREÇO_PROPRIETARIO"] = rua;
    valores.N = numero;
    valores["N°"] = numero;
    valores["Nº"] = numero;
    // ENDEREÇO_1/ENDERECO_OBRA: modelos antigos com o endereço num campo único.
    valores["ENDEREÇO_1"] = enderecoComNumero;
    valores.ENDERECO_OBRA = enderecoComNumero;
  }

  if (embarcacao) {
    valores.NOME_EMB = s(embarcacao.nome);
    valores.NOME_ANT = s(embarcacao.nomeAnterior);
    valores.OP_2 = s(embarcacao.opcaoNome2);
    valores.OP_3 = s(embarcacao.opcaoNome3);
    valores.N_INSC = s(embarcacao.numeroInscricao);
    valores.TIPO_DE_EMB = s(embarcacao.tipo);
    valores.ATIVIDADE = s(embarcacao.atividade);
    valores["AREA_NAVEGAÇÃO"] = s(embarcacao.areaNavegacao);
    valores.COMPRIMENTO = s(embarcacao.comprimento);
    valores.BOCA = s(embarcacao.boca);
    valores.PONTAL = s(embarcacao.pontal);
    valores.CONTORNO = s(embarcacao.contorno);
    valores.CALADO_MAX = s(embarcacao.caladoMax);
    valores.ARQ_B = s(embarcacao.arqueacaoBruta);
    valores.ARQ_L = s(embarcacao.arqueacaoLiquida);
    valores.PBT = s(embarcacao.pbt);
    valores.LPP = s(embarcacao.lpp);
    valores.TRIP = s(embarcacao.tripulantes);
    valores.PASS = s(embarcacao.passageiros);
    valores["LOTAÇÃO"] = s(embarcacao.lotacao);
    valores.ANO = s(embarcacao.ano);
    valores["DATA_CONSTRUÇÃO"] = s(embarcacao.dataConstrucao);
    valores.N_CASCO = s(embarcacao.numeroCasco);
    valores.MAT_CASCO = s(embarcacao.materialCasco);
    valores.LOCAL_INSC_ = s(embarcacao.localInscricao);
    valores["DATA_DA_INSCRIÇÃO"] = s(embarcacao.dataInscricao);
    valores.N_REGISTRO_TM = s(embarcacao.registroTm);
    valores.APOLICE_DPEM = s(embarcacao.apoliceDpem);
    valores.VALIDADE_DPEM = s(embarcacao.validadeDpem);
    valores.TIPO_DE_PROPULSAO = s(embarcacao.tipoPropulsao);
    valores.QNT_MOTOR = motores.length > 0 ? String(motores.length) : "";
  }

  if (motorPrincipal) {
    valores.MMOTOR = s(motorPrincipal.marca);
    valores.POT = s(motorPrincipal.potencia);
    valores.N_SERIE = s(motorPrincipal.numeroSerie);
  }

  if (aquisicao) {
    valores.N_NF = s(aquisicao.numeroNf);
    valores.DT_VENDA = s(aquisicao.dataVenda);
    valores.LOCAL = s(aquisicao.local);
    valores.VENDEDOR = s(aquisicao.vendedor);
    valores.CPFCNPJ1 = s(aquisicao.cpfCnpjVendedor);
    valores.VALOR = s(aquisicao.valor);
  }

  if (habilitacaoCha) {
    valores.N_CHA = s(habilitacaoCha.numero);
    valores["CHA_D_EMISSÃO"] = s(habilitacaoCha.dataEmissao);
    valores["CATEGORIA_"] = s(habilitacaoCha.categoria);
    valores.CATEGORIA_DESCIÇÃO = s(habilitacaoCha.categoria);
  }

  if (habilitacaoCir) {
    valores.N_DA_CIR = s(habilitacaoCir.numero);
    // CATEGORIA_ é usado tanto no CIR quanto no CHA — se o cliente só tem CIR,
    // ainda preenche; se tem os dois, o CHA (checado acima) prevalece.
    if (!valores["CATEGORIA_"]) {
      valores["CATEGORIA_"] = s(habilitacaoCir.categoria);
    }
  }

  if (obra) {
    // No memorial, o campo "ID_OBRA" aparece na frase "instalada no endereço: [ID_OBRA]" —
    // o que o formulário quer ali é o endereço da obra, não o código interno.
    valores.ID_OBRA = s(obra.endereco) || s(obra.idObra);
    valores.TIPO_DE_OBRA = s(obra.tipoObra);
    valores.ITEM_DA_OBRA_CODIGO = s(obra.itemObraCodigo);
    valores["DESCRIÇÃO_DA_OBRA"] = s(obra.descricaoObra);
    valores.NORMAM_DE_USO = s(obra.normamDeUso);
    valores.CPDLAG = s(obra.cpDlAg);
    if (engenheiro) {
      valores.RESP_TECNICO = s(engenheiro.nomeCompleto);
      valores.N_CREA = s(engenheiro.crea);
      valores.NOME_ENGENHEIRO = s(engenheiro.nomeCompleto);
      valores.TITULO_PROFISSIONAL = s(engenheiro.tituloProfissional);
      // No memorial, TITULO é o "Título Profissional" do responsável técnico, não o título da obra.
      valores.TITULO = s(engenheiro.tituloProfissional);
    } else {
      valores.RESP_TECNICO = s(obra.respTecnico);
      valores.N_CREA = s(obra.nCrea);
    }
    valores.ENDERECO_OBRA = s(obra.endereco);
    valores.RIO_LOCALIZADO = s(obra.rioLocalizado);
    valores.DISTANCIA_RIO_KM = s(obra.distanciaRioKm);
    // Obra tem área de navegação e atividade próprias — sobrescrevem as da
    // embarcação (se ambas vierem no mesmo contexto, o que não deve acontecer
    // na prática já que são fluxos de documento distintos).
    valores["AREA_NAVEGAÇÃO"] = s(obra.areaNavegacao);
    valores.ATIVIDADE = s(obra.atividade);
    valores.PONTO_A = s(obra.pontoA);
    valores.PONTO_B = s(obra.pontoB);
    valores.PONTO_C = s(obra.pontoC);
    valores.PONTO_D = s(obra.pontoD);
    valores.COMPRIMENTO = s(obra.comprimento);
    valores.LARGURA = s(obra.largura);
    valores.AREA_CONSTRUIDA = s(obra.areaConstruida);
    valores.APOIADO_SOBRE = s(obra.apoiadoSobre);
    valores.ESTRUTURA_COBER = s(obra.estruturaCober);
    valores.MAT_ESTRUTURA = s(obra.matEstrutura);
    valores.MAT_PAREDES = s(obra.matParedes);
    valores.MAT_PISO_ = s(obra.matPiso);
    valores.MAT_COBERTURA = s(obra.matCobertura);
    valores.LISTA_MAT_DE_CONST_E_DIMESOES = s(obra.listaMatConstrucaoDimensoes);
    valores.FONT_ENERGIA = s(obra.fontEnergia);
    valores.BANHEIRO_SN = obra.banheiroSn ? (obra.banheiroSn === "sim" ? "Sim" : "Não") : "";
    valores.PIA_OU_OUTROS = s(obra.piaOuOutros);
    valores.CALADO_CAR = s(obra.caladoCar);
    valores.CALADO_LEVE = s(obra.caladoLeve);
    valores.DESL_CAR = s(obra.deslCar);
    valores.DESL_LEVE = s(obra.deslLeve);
    valores.PESO_ADICIONAL = s(obra.pesoAdicional);
    valores.CARGA_SUPORTADA = s(obra.cargaSuportada);
    valores["LOTAÇÃO_MAX"] = s(obra.lotacaoMax);
    valores.COLETES = s(obra.coletes);
    valores.BOIAS = s(obra.boias);
    valores.MAT_TAMBORES = s(obra.matTambores);
    valores.QNT_TAMBORES = s(obra.qntTambores);
    valores.VOLUME_TAMBORES = s(obra.volumeTambores);
  }

  for (const marcacao of context.camposMarcacao ?? []) {
    valores[marcacao.campo] =
      context.servicoId && marcacao.servicoIds.includes(context.servicoId)
        ? marcacao.valorMarcado
        : "";
  }

  return valores;
}
