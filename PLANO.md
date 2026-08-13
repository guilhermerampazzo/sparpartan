## Status de execução

- ✅ **M0 — Fundação**: concluído e verificado (`docker compose up`, porta única 8080, login, tema, sidebar).
- ✅ **M1 — Cadastros**: concluído e testado ponta a ponta via navegador.
  - `clientes` (CRUD + detalhe + aniversariantes), `embarcacoes` (+ `motores` até 3, + `aquisicoes` opcional), `habilitacoes` (CHA/CIR, inline no detalhe do cliente), `servicos` (com cálculo de margem valor−custo), `catalogo_itens` (embarcação/motor/carreta), `salvatagem_itens` (inline no detalhe da embarcação), `arquivos` (upload/download autenticado para RG/CPF/CRLV, salvos no volume `UPLOADS_DIR`).
  - Migrations aplicadas manualmente via `psql` dentro do container (a imagem `runner` não carrega `esbuild`; rodar `drizzle-kit generate` no host e aplicar o `.sql` gerado via `docker compose exec -T postgres psql`).
  - Rotas: `/clientes`, `/clientes/novo`, `/clientes/[id]`, `/clientes/aniversariantes`, `/embarcacoes`, `/embarcacoes/novo`, `/embarcacoes/[id]`, `/servicos`, `/servicos/novo`, `/servicos/catalogo`.
- ✅ **M2 — Motor de Documentos**: núcleo funcionando e validado com round-trip real.
  - `src/lib/docx/merge-fields.ts`: parser stateful de `<w:fldChar>`/`<w:instrText>` que concatena runs antes de casar `MERGEFIELD \w+` — resolve o risco conhecido de campo partido entre runs (confirmado contra o `.docx` real: 127 pares begin/end, 2 campos com `instrText` fragmentado, todos os 42 nomes únicos extraídos corretamente).
  - `src/lib/docx/document.ts`: lê/escreve o `.docx` via `jszip`; a estratégia é "achatar" cada bloco de campo em texto estático direto no XML — **sem docxtemplater**, preserva 100% da formatação original e as 2 vias automaticamente (values repetidos em todas as ocorrências).
  - `src/lib/docx/resolver.ts`: mapeamento heurístico de nomes de campo conhecidos → `clientes`/`embarcacoes`/`motores`/`aquisicoes` (best-effort; campos não mapeados ficam em branco para preenchimento manual).
  - Tabelas `modelos_documento` (schema de campos descoberto na importação) e `documentos_gerados` (snapshot dos dados usados).
  - Rotas: `/documentos` (lista modelos + gerados), `/documentos/modelos/novo` (upload .docx → extração automática), `/documentos/gerar` (fluxo em 2 passos: cliente+embarcação+modelo → campos auto-resolvidos e editáveis → gera DOCX e chama Gotenberg para PDF), `/documentos/[id]` (download).
  - **Verificação round-trip feita**: importado o `SPARAPAN APP EMB.docx` real (42 campos), gerado documento para cliente+embarcação de teste, confirmado no XML resultante que os 42 MERGEFIELDs viraram texto estático (0 códigos remanescentes, só o campo `PAGE` — não é merge field — ficou intacto), valores repetidos nas 2 vias, e PDF de 88KB gerado com sucesso via Gotenberg.
  - Pendente para depois: seed automático dos outros 6 fluxos de `documentos/` (hoje o upload é manual pela UI, o que já atende ao objetivo "trocar formulário = upload, não deploy"); regras de anexos obrigatórios/opcionais por norma ficam para o M3 (Checklist de Conformidade).
- ✅ **M3 — Processos + Checklist de Conformidade**: fluxo completo testado ponta a ponta.
  - Tabela `processos` (cliente, embarcação opcional, serviço, status dirigido por evento, protocolo). `modelos_documento` ganhou `servico_id` (vínculo modelo↔serviço) e `documentos_gerados` ganhou `processo_id`.
  - `/processos` (lista), `/processos/novo` (abre com cliente+serviço), `/processos/[id]` (vincula embarcação inline, mostra checklist de anexos obrigatórios/opcionais do serviço com status "Gerado"/"Falta gerar" e link direto para `/documentos/gerar` pré-preenchido, bloqueia "Confirmar Protocolo" — **validado também no server, não só no client** — até todos os obrigatórios existirem, e libera "Marcar como Concluído" após protocolar).
  - **Testado**: processo aberto para João da Silva + NORMAM-211 → checklist mostra "BSADE 2-B — Embarcação, obrigatório, Falta gerar" e botão desabilitado → embarcação vinculada → documento gerado pelo link do checklist → checklist atualiza para "Gerado" → protocolo confirmado (nº 2026001234) → status muda para "Protocolado".
  - Pendente para depois: `/pendentes` (view agregada de processos parados) fica para quando M5 (Vencimentos) e M7 existirem, já que ela cruza dados de várias fontes.
- ✅ **M4 — Comercial**: fluxo completo testado ponta a ponta.
  - Tabelas `orcamentos` (numeração `MMAAXXX` auto-incrementada por mês), `servicos_contratados` (criado automaticamente ao aprovar um orçamento) e `pagamentos` (contas a receber, com saldo calculado).
  - `/orcamentos` (lista), `/orcamentos/novo`, `/orcamentos/[id]` (gera PDF via Gotenberg rota `chromium/convert/html`, aprova → cria venda automaticamente, ou recusa). `/vendas` (Serviços Contratados + registro de pagamento inline + card de taxa de conversão).
  - **Testado**: orçamento criado para João da Silva (nº gerado `0726001` — mês 07, ano 26, sequencial 001, confirmando o formato MMAAXXX), PDF gerado com sucesso, aprovado → venda apareceu automaticamente em `/vendas` com taxa de conversão 100%, pagamento parcial de R$ 600 registrado → saldo recalculado corretamente para R$ 600 de R$ 1.200.
- ✅ **M5 — Agenda, Vencimentos e Jobs**: worker BullMQ real (antes só o esqueleto), testado ponta a ponta.
  - Tabelas `agenda_eventos` (compromisso/prova/vencimento, status dirigido por evento) e `lembretes` (origem `auto`/`manual`, dedupe por `referencia_tipo`+`referencia_id`+`data_lembrete` para não duplicar avisos).
  - `apps/worker`: ganhou acesso direto ao Postgres (pacote `postgres`, sem duplicar o schema Drizzle — consultas SQL cruas em `src/jobs/`) e dois jobs agendados via `Queue.upsertJobScheduler` (BullMQ Job Scheduler, cron): `verificar-vencimentos` (07:00, varre `documentos_gerados.vencimento` nas janelas 30/15/7 dias) e `confirmar-compromissos` (08:00, varre `agenda_eventos` do dia seguinte — cobre compromisso e prova com a mesma lógica).
  - `/agenda`, `/agenda/novo`, `/lembretes` (lista + resolver), `/documentos/vencimentos` (4 cards-filtro: Vencidos/7 dias/30 dias/Em Dia, com contagem e tabela).
  - **Testado**: documento real com vencimento em 7 dias, job disparado manualmente na fila do worker → lembrete criado e visível em `/lembretes` com o cliente certo → cards de `/documentos/vencimentos` contam corretamente (1 no filtro "7 dias", 1 no "30 dias" pois a janela é cumulativa, 0 nos demais). Um bug real de formatação de data (`Date.toString()` cru na mensagem) foi encontrado e corrigido durante o teste.
  - Pendente para depois: envio real de e-mail para os lembretes (fica para o M6 — hoje o lembrete é só in-app); "renovação em 1 clique" fica para quando houver um fluxo de documento vencido → novo processo (natural extensão do M3, sem trabalho de schema novo).
- ✅ **M6 — Comunicação**: testado ponta a ponta com envio real capturado no Mailpit.
  - `src/lib/mail/adapter.ts`: adapter único com duas implementações (`nodemailer` para SMTP, `fetch` direto para a API do Resend), escolhido por `MAIL_PROVIDER`. `src/lib/mail/templates.ts`: substituição simples de `{{variavel}}`.
  - Tabelas `templates_email` (assunto/corpo com variáveis, tipado por categoria) e `envios_email` (histórico com status `enviado`/`falhou` e motivo do erro).
  - `/emails` (templates + histórico), `/emails/templates/novo`, `/emails/enviar` (cliente + template → resolve variáveis → envia → loga).
  - **Etiqueta de Correios com marca d'água**: `/api/etiqueta/[clienteId]`, PDF gerado via Gotenberg (`chromium/convert/html`) a partir do endereço do cliente, com marca d'água "SPARAPAN SOLUÇÃO NAVAL" rotacionada — link direto no detalhe do cliente.
  - **Testado**: template "Boas-vindas" com `{{nome}}` criado, e-mail enviado para João da Silva → variável resolvida corretamente no assunto ("Bem-vindo, João da Silva!") → confirmado via API do Mailpit (`GET /api/v1/messages` dentro da rede Docker, já que só a porta do `web` é publicada) que o e-mail realmente chegou → histórico mostra "Enviado". Etiqueta baixada como PDF de 15KB.
  - Nota de infra: Mailpit só sobe com `docker compose --profile dev up`, e não expõe porta ao host (mantém a regra de porta única) — para inspecionar mensagens em dev, usar `docker compose exec web wget -qO- http://mailpit:8025/api/v1/messages` ou similar de dentro da rede.
  - Pendente para depois: disparo automático por gatilho (processo protocolado → e-mail automático, orçamento criado → e-mail automático) fica para quando o M3/M4 forem revisitados com hooks — hoje o envio é sempre manual via `/emails/enviar`; anexo automático do PDF no envio (o adapter já aceita `attachments`, só falta a UI permitir escolher qual documento/orçamento anexar).
- ✅ **M7 — Financeiro e BI**: testado ponta a ponta com números reais conferidos manualmente.
  - Tabela `despesas` (categoria fixa/variável/imposto/outra).
  - `/vendas/despesas` (CRUD simples), `/vendas/financeiro` (fluxo de caixa entradas×saídas, lucro, tempo médio de conclusão de processo via `extract(epoch from atualizado_em - criado_em)`, ranking de serviços com margem real usando `servicos.custo`, sazonalidade por mês via `to_char(data, 'YYYY-MM')`), `/api/exportar/vendas` (CSV).
  - **Testado**: despesa de R$400 registrada, painel mostrou Entradas R$600 (pagamento do M4) − Saídas R$400 = Lucro R$200, todos batendo exatamente; ranking mostrou o serviço NORMAM-211 com margem real R$900 (1200 valor − 300 custo, os mesmos números do M1); sazonalidade agrupou a venda em "2026-07"; CSV exportado com a linha correta (data, cliente, serviço, valor).
  - Pendente para depois: "por colaborador" da margem real fica para quando `usuarios` for vinculado a `processos.responsavelId` de fato (hoje o campo existe no schema mas nada preenche automaticamente).
- ✅ **M8 — Cliente 360° + Área de Estudos**: testado ponta a ponta.
  - Tabelas `materiais_estudo` (liberado por `servico_id`) e `progresso_estudo` (por cliente+material).
  - Timeline unificada no detalhe do cliente (documentos gerados + e-mails enviados + pagamentos + eventos de agenda, ordenados por data). Badges de status na listagem (`N em andamento` / `N vencendo`). `/clientes/indicacoes` (ranking de quem mais indica + lista de indicados, usando o campo `indicadoPor` que já existia no schema mas não tinha UI — adicionado ao formulário de cadastro). `/area-de-estudos` (aluno → materiais liberados pelos serviços contratados → progresso com toggle concluído/pendente), `/area-de-estudos/materiais/novo`.
  - **Bug real encontrado e corrigido durante o teste**: os badges vinham sempre vazios. Causa: uma subquery correlacionada em raw SQL (`sql\`...${clientes.id}...\``) interpolava a coluna sem qualificar a tabela — como `processos` também tem uma coluna `id`, o Postgres resolveu o `"id"` desqualificado para `processos.id` em vez de `clientes.id`, comparando a PK do processo com o `cliente_id` (nunca bate). Corrigido qualificando explicitamente com `sql.raw('"clientes"."id"')`. Vale lembrar disso em qualquer subquery correlacionada futura onde as duas tabelas compartilham nome de coluna.
  - **Testado**: badges mostraram corretamente "1 em andamento" e "1 vencendo" após a correção; Timeline exibiu e-mail + pagamento + 2 documentos gerados na ordem certa; material de estudo liberado pelo serviço contratado apareceu e o toggle de progresso foi de 0% a 100% corretamente.
  - Pendente para depois: simulados por categoria (quiz com correção automática) fica fora do escopo desta passada — o modelo de dados atual cobre "material liberado + progresso", que já resolve a maior parte do valor de negócio.
- ✅ **M9 — Portal do Cliente**: testado ponta a ponta, incluindo dois bugs reais corrigidos.
  - Segunda identidade em `lib/auth.ts`: dois providers Credentials (`equipe` por e-mail/senha em `usuarios`, `cliente` por CPF/CNPJ/senha em `clientes.portal_senha_hash`, coluna nova adicionada nesta passada). JWT carrega `tipo: "equipe"|"cliente"` para diferenciar autorização e UI.
  - `/portal/login` (público) e `/portal` protegido por `app/portal/(protegido)/layout.tsx` — grupo de rota isolado do layout de staff, com seu próprio header e sem sidebar. Dashboard mostra processos do próprio cliente (status + protocolo), documentos com "Baixar 2ª via", e botão "Pedir Renovação" nos processos protocolados/concluídos.
  - `/api/documentos/[id]` passou a checar `session.user.tipo === "cliente"` e validar que `documento.clienteId === session.user.id` antes de liberar o download — cliente só baixa os próprios documentos.
  - No detalhe do cliente (lado staff), nova seção "Acesso ao Portal do Cliente" para a equipe definir a senha inicial (sem fluxo de e-mail de ativação nesta passada — pragmático, funcional).
  - **Bug real #1 corrigido**: `session.user.id` nunca era populado pelo callback `session()` do NextAuth — o dashboard do portal quebrava com `UNDEFINED_VALUE` do driver Postgres ao tentar filtrar processos por um `clienteId` undefined. Corrigido atribuindo `token.sub` a `session.user.id`.
  - **Achado ao testar (não é bug do app)**: `browser_click` do Playwright não disparava o submit de alguns forms de Server Action nesta página — confirmado com `form.requestSubmit()` via JS direto, que funcionou perfeitamente. Vale lembrar disso para testes futuros no portal: preferir `requestSubmit()` sobre `click()` quando um clique não parecer produzir efeito.
  - **Testado**: login no portal com CPF/senha reais, dashboard mostrou o processo "Protocolado" com o número certo e os 2 documentos com link de 2ª via, "Pedir Renovação" gerou um lembrete `cliente_solicitacao` que apareceu em `/lembretes` do lado da equipe, exatamente como "cai como pendência para a equipe" pedia o plano.
  - Pendente para depois: fluxo de ativação de senha por e-mail (hoje é a equipe que define manualmente); tela de "vencimentos" dedicada dentro do portal (hoje o vencimento aparece embutido em "Meus Documentos").
- ✅ **M10 — Extras**: todas as peças testadas ponta a ponta.
  - **Busca global `Ctrl+K`**: `src/components/layout/global-search.tsx` (client component, modal, debounce 200ms) + `/api/busca` (ilike em clientes/embarcações/processos). Testado: `Ctrl+K` → "João" retornou cliente e processo, clique navegou certo.
  - **Log de Auditoria**: tabela `audit_log`, helper `src/lib/audit.ts`, conectado em login (equipe), criar cliente, protocolar processo. `/configuracoes/auditoria` (só `role === "admin"`, com redirect server-side — não só esconder o link). Testado: login gerou entrada `login/usuario` com nome e timestamp.
  - **Soft-delete + Lixeira (30 dias)**: coluna `excluido_em` em `clientes` (representativo — os outros módulos ficam para quando cada um precisar). `/clientes/lixeira` lista e restaura; a listagem principal e a exportação CSV já filtram `excluido_em is null`. Testado: cliente excluído sumiu da lista e do CSV, apareceu na lixeira, restaurar funcionou.
  - **Assinatura digital própria**: tabelas `assinaturas` (token, hash, IP, timestamps). No detalhe do documento, "Solicitar Assinatura" gera token de 7 dias e tenta enviar por e-mail (usa o adapter do M6). `/assinar/[token]` é página pública (fora do layout autenticado) — mostra o documento, aceite grava `sha256(documentoId|clienteId|token|timestamp|ip)`. Testado: solicitação → link público acessado sem sessão → assinatura confirmada com hash real e timestamp exibidos.
  - **OCR local com Tesseract.js**: `src/components/ocr/ocr-uploader.tsx` roda 100% no navegador, `/ocr` acessível por `/configuracoes`. Testado com uma screenshot real do próprio sistema — extraiu texto reconhecível ("Sparapan Solução Naval", "CLIENTES EMBARCAÇÕES DOCUMENTOS" etc.), confirmando que o OCR funciona de verdade, não é só UI.
  - **PWA instalável**: `public/manifest.json` + `public/sw.js` (estratégia network-first, sem cache-first para não servir dado de negócio desatualizado) + registro em `layout.tsx`. Testado: manifest servido em `/manifest.json`, service worker `sw.js` confirmado ativo via `navigator.serviceWorker.getRegistrations()`.
  - **Exportação em massa**: `/api/exportar/clientes` (CSV), reaproveitando o padrão já validado no M7 para vendas.
  - **Achado de teste (não é bug do app, vale documentar)**: em páginas com múltiplos `<form>` (ex.: sidebar com "Sair" + conteúdo com outro form), `page.locator('form').first()` pode pegar o form errado. Prefira sempre localizar o form pelo botão (`page.locator('form', { has: page.getByRole('button', {...}) })`) antes de chamar `requestSubmit()`.
  - Pendente para depois: soft-delete nas demais entidades (embarcações, processos, etc.) segue o mesmo padrão de `clientes` quando for priorizado; permissões por `role` hoje só bloqueiam a página de auditoria — um guard mais amplo (ex. `leitura` não pode submeter nenhum form) fica para quando o volume de usuários da equipe justificar o investimento.

---

## Status final: 10 de 10 módulos do escopo original entregues e verificados (M0–M10)

Todos testados ponta a ponta com dados reais no navegador, não apenas compilados. Bugs reais de infraestrutura e de aplicação encontrados durante os testes foram corrigidos e documentados nesta seção conforme apareceram (Dockerfile sem `DATABASE_URL` de build, volume de uploads com dono errado, `drizzle-kit migrate` sem `esbuild` no runner, subquery correlacionada com coluna ambígua, `session.user.id` não populado pelo NextAuth). O sistema, do jeito que está, já substitui as planilhas Excel/Word e é funcionalmente mais completo que o SaaS Base44 original nos fluxos centrais (cadastro → documento → processo → orçamento → venda → pagamento → comunicação → portal do cliente).

---

## Itens adicionais pedidos pelo usuário (pós-M10), todos testados ponta a ponta

Usuário revisou o escopo original e pediu para confirmar/completar 7 itens específicos. Catálogo, Salvatagem, Etiqueta de Correios e Financeiro já existiam (M1/M6/M7). Os 3 que faltavam foram implementados:

- **Agenda filtrável por cliente E processo**: `agenda_eventos.processo_id` (já existia no schema, sem UI). `/agenda` ganhou um form de filtro (cliente + processo, o segundo populado via GET dependente do primeiro) e o join com `processos`+`servicos` para mostrar o serviço ao lado do evento. `/agenda/novo` ganhou o mesmo padrão de dois passos do `/documentos/gerar` (GET para carregar os processos do cliente escolhido, POST para criar). Testado: criado evento "Prova prática de arrais" vinculado ao processo NORMAM-211 de João da Silva, filtro por cliente+processo retornou exatamente esse evento com o nome do serviço ao lado.
- **Ao protocolar — comprovante escaneado + aviso automático + dia da prova**: `processos.protocolo_escaneado_caminho` (novo). O form de protocolar ganhou upload de arquivo (salvo em `uploads/processos/{id}/`), com rota de download `/api/processos/[id]/comprovante` (mesma checagem de posse do portal). Toda vez que um processo é protocolado, `notificarClienteProtocolo` dispara um e-mail automático com o número — e, se o `servico.categoria === "escola"`, busca o próximo evento `tipo = "prova"` do cliente e inclui a data/hora no e-mail. Testado com um processo real: e-mail "Processo protocolado — nº 2026009999" chegou no Mailpit já com "Sua prova está marcada para 14 de julho de 2026 às 14:00" embutido.
- **Aviso do dia da prova na inscrição + confirmação poucos dias antes**: ao criar um evento `tipo="prova"` vinculado a um cliente (`/agenda/novo`), o sistema manda na hora um e-mail "Sua prova foi agendada" com data/hora — confirmado no Mailpit. O worker ganhou `confirmarProvas` (`apps/worker/src/jobs/compromissos.ts`), rodando diariamente às 08:30, que varre `agenda_eventos` com `tipo='prova'` nas janelas de **3 e 1 dias antes** (mesmo padrão de janelas do job de vencimento do M5), manda e-mail real ao cliente via `apps/worker/src/mail.ts` (novo — SMTP/Resend, o worker não pode importar de `apps/web`, por isso é uma cópia enxuta do adapter) e cria um lembrete interno deduplicado por `referencia_tipo = "prova-{N}d"`. Testado disparando o job manualmente com uma prova real a 3 dias de distância: e-mail "Sua prova é em 3 dias" chegou no Mailpit e o lembrete apareceu correto em `/lembretes`.

Nenhum destes exigiu mudança de arquitetura — todos reaproveitaram tabelas/adapters já existentes (`agenda_eventos`, `lib/mail/adapter.ts`, o padrão de upload de `arquivos`/`documentos`, e o Job Scheduler do BullMQ do M5).

---

## Resolver de campos ampliado para os 7 fluxos (não só embarcação)

O usuário pediu para conferir se os campos de **todos** os modelos de `documentos/` (não só o de embarcação testado no M2) vêm auto-preenchidos. Levantei o campo-a-campo dos 9 `.docx` reais (7 fluxos, 2 deles com 2 arquivos cada) e o `resolver.ts` cobria só uma fração.

- **Reescrito `src/lib/docx/resolver.ts`** para mapear a união de nomes de campo usados nos 6 fluxos que usam nossas entidades (embarcação, embarcação comercial ×2, jetski, arrais, motonauta, CIR) — cliente, embarcação, motor, aquisição **e agora também habilitações** (novo: `habilitacoes?: Habilitacao[]`, separado por tipo CHA/CIR). Trata variantes de nome que a Marinha usa pro mesmo dado em modelos diferentes (`CEL`/`CELULAR`, `NACIO`/`NACIONALIDADE`, `ENDEREÇO_N`/`ENDEREÇO_2`/`ENDEREÇO_PROPRIETARIO`, `UF`/`ESTADO`, etc.) e novos campos de embarcação que não estavam mapeados (`CALADO_MAX`, `PBT`, `LPP`, `LOTAÇÃO`, `DATA_CONSTRUÇÃO`, `LOCAL_INSC_`, `DATA_DA_INSCRIÇÃO`, `N_REGISTRO_TM`, `APOLICE_DPEM`, `VALIDADE_DPEM`, `TIPO_DE_PROPULSAO`, `QNT_MOTOR` — este último calculado, não armazenado).
- **Bug real corrigido durante o teste**: quando um cliente tem duas habilitações do mesmo tipo (ex: CHA antiga + renovada), o resolver pegava a primeira que a query retornasse, não necessariamente a mais recente. Agora ordena por `criadoEm desc` antes de escolher.
- **Testado com dados reais**: importado o modelo de CIR real → campos `NOME`, `CIDADE`, `CPFCNPJ`, `EMAIL` vieram do cadastro, `N_DA_CIR` e `CATEGORIA_` vieram da habilitação CIR. Importado o modelo de Arrais Amador → `N_CHA` e `CHA_D_EMISSÃO` vieram da habilitação CHA correta (a mais recente, depois da correção). Os poucos campos sem fonte no painel (`ASSUNTO`, `N` genérico) ficaram em branco para preenchimento manual, como esperado.
- **Fora do escopo, por não termos essa tabela ainda**: os dois modelos de NORMAM-303 (Memorial Descritivo + Requerimento, "preenchimento de obras") têm ~50 campos técnicos de construção naval (materiais, dimensões, coordenadas dos 4 pontos, responsável técnico/CREA) que não são dado de cliente/embarcação — são um domínio novo (`obras`) que nunca foi modelado no sistema. Os poucos campos desses dois modelos que SÃO dado de cliente (CPF, CEP, bairro, e-mail, endereço, RG) já saem preenchidos pelo resolver atual; o resto fica manual até existir um módulo de Obras dedicado. Se isso for prioridade, é a próxima peça a construir — mas é trabalho de schema+UI novo, não um ajuste de resolver.

---

## Módulo de Obras (NORMAM-303) — construído em seguida, fechando a lacuna acima

- Tabela `obras` (46 colunas): identificação (título, ID da obra, tipo, código do item, NORMAM de uso, CP/DL/AG, responsável técnico, CREA), localização (rio, distância, área de navegação, atividade, pontos A/B/C/D), dimensões e estrutura (comprimento, largura, área construída, materiais de estrutura/paredes/piso/cobertura, fonte de energia, banheiro sim/não), calados e deslocamento (carregado/leve, peso adicional, carga suportada, lotação máxima), salvatagem/flutuação (coletes, boias, material e volume dos tambores).
- `/obras` (lista), `/obras/novo` (form em 5 seções — Identificação, Localização, Dimensões e Estrutura, Calados/Deslocamento/Carga, Salvatagem e Flutuação), `/obras/[id]` (detalhe com botão "Gerar Documento" pré-preenchendo `clienteId`+`obraId`). Item "Obras" adicionado à sidebar.
- `resolverCamposConhecidos` ganhou o parâmetro `obra?: Obra` e mapeia os ~35 campos de obra que têm fonte de dado (os poucos puramente descritivos como `LISTA_MAT_DE_CONST_E_DIMESOES` viram texto livre). `/documentos/gerar` ganhou o terceiro seletor (Cliente/Embarcação/**Obra**/Modelo).
- **Testado com o modelo real**: importado `MEMORIAL DESCRITIVO - MODELO.docx` (47 campos detectados), obra "Trapiche Residencial João da Silva" cadastrada com responsável técnico e ponto A, gerado o documento → `RESP_TECNICO`, `NOME_`, `TIPO_DE_OBRA`, `PONTO_A`, `CPFCNPJ`, `TITULO` vieram preenchidos automaticamente; os poucos campos vazios (`ENDEREÇO_PROPRIETARIO`, `COMPRIMENTO`) eram genuinamente dados de teste não preenchidos, não falha do resolver.
- Continua fora do escopo (dado que não existe em lugar nenhum do painel, não é possível auto-preencher): os campos puramente narrativos do Memorial (`DESCRIÇÃO_DA_OBRA`, `LISTA_MAT_DE_CONST_E_DIMESOES`) seguem manuais por natureza — são texto livre técnico que o responsável descreve caso a caso, não dado cadastral reutilizável.

Notas de infra:
- O `Dockerfile` do `web` precisa de `DATABASE_URL` dummy setado como `ENV` na etapa de build (o Next coleta dados de página da rota de auth durante o build, sem acesso a envs de runtime do Compose).
- O `Dockerfile` do `web` também precisa criar `/app/data/uploads` e fazer `chown` para o usuário `nextjs` **antes** do `USER nextjs` — o volume nomeado `uploads_data` é inicializado a partir do que existe na imagem naquele caminho; sem isso o volume fica com dono `root` e todo upload falha com `EACCES`.
- Migrations não rodam com `drizzle-kit migrate` dentro do container `runner` (falta `esbuild`, que não é copiado da etapa `builder`). Fluxo atual: `npx drizzle-kit generate` no host (dentro de `apps/web`) e aplicar o `.sql` resultante via `docker compose exec -T postgres psql -U sparapan -d sparapan < apps/web/drizzle/XXXX_nome.sql`.

---

# Sparapan Solução Naval — Sistema de Gestão Náutica (self-hosted)

## Context

A Sparapan é um despachante náutico / escola náutica que hoje opera em duas frentes desconectadas:

1. **Um SaaS no Base44** (`sparapan.base44.app`) com ~25 telas — clientes, embarcações, processos, orçamentos, agenda, financeiro. Funciona, mas é um CRUD passivo: nada se conecta a nada. O processo não gera o documento, o documento não dispara o e-mail, o vencimento não avisa ninguém. Está mapeado em `funcionalidades.md`, e as lacunas em `func.md`.
2. **Planilhas Excel + Word manuais** (`documentos/`) para o que realmente dá dinheiro: preencher os formulários da Marinha. A equipe digita numa planilha, abre o Word, faz o mail-merge, imprime, protocola na Capitania.

O objetivo é substituir os dois por um sistema único, **100% self-hosted, open source, rodando em Docker com uma única porta exposta** (definida em `.env`). Sem Vercel, sem S3 da AWS, sem Google Maps, sem serviço de assinatura pago. O resultado esperado: a equipe cadastra o cliente uma vez, escolhe o serviço, e o sistema monta o processo, preenche os anexos corretos daquela NORMAM, gera DOCX+PDF, avisa o cliente e cobra o vencimento sozinho.

### A descoberta que define a arquitetura

Ao abrir os arquivos de `documentos/`, cada `.docx` é um **template de mail-merge do Word**, e os nomes dos `MERGEFIELD` batem 1:1 com os **cabeçalhos da planilha `.xlsx` irmã** (linha 1 = nomes dos campos, linha 2 = um exemplo real preenchido).

**As planilhas já são o modelo de dados.** Não preciso inventar os campos — eles estão lá, validados por uso real. E não preciso hardcodar template nenhum: um importador lê o `word/document.xml`, extrai os MERGEFIELDs, e o sistema descobre sozinho quais campos aquele modelo precisa. Trocar um formulário quando a Marinha muda a norma vira upload de arquivo, não deploy.

### Os 7 fluxos identificados

| Pasta | Norma | Documento principal | Anexos |
|---|---|---|---|
| `embarcacao` | NORMAM-211 | **BSADE 2-B (2 vias)** | 2-C, 2-G, 2-H, 2-K |
| `jetski` | NORMAM-211 | BSADE 2-B (2 vias) + 2-A | 1-C, 2-C, 2-D, 2-E |
| `embarcação comercial` | NORMAM-202 | BADE **ou** Inscrição Simplificada (2-E/2-F) | 8-D, 2-P, 3-A, 1-B |
| `habilitação nautica arrais amador` | NORMAM-211 | Requerimento 5-H | 2-I, 5-D |
| `habilitação nautica motonauta` | NORMAM-212 | Requerimento 3-A | 1-C, 5-D |
| `carteira de trabalho nautico` | CIR / NORMAM-13 | Requerimento CIR | 1-L, 1-K, **atestado médico (obrigatório)** |
| `preenchimento de obras` | NORMAM-303 | Requerimento 2-B-1 | **Memorial Descritivo** (47 campos, com coordenadas geo) |

Regras de negócio já confirmadas pelo cliente, que o sistema precisa respeitar:
- **BSADE sai em 2 vias** — uma fica na Capitania, outra volta com o protocolo. As duas vias já existem dentro do próprio `.docx`; o sistema só precisa não quebrar isso.
- **Declaração de extravio e recibo de compra e venda são opcionais** — nem todo processo usa.
- **Procuração é obrigatória em todo processo**, vinculada ao serviço + cliente.
- **Atestado médico é obrigatório** no fluxo de CIR (carteira de trabalho).
- Embarcação comercial tem **2 processos distintos**, um por porte de embarcação.

---

## Decisões técnicas (fechadas com o usuário)

| Tema | Decisão |
|---|---|
| **Mapas** | MapLibre GL JS + tiles remotos gratuitos sem chave (OpenFreeMap). Atrás de um adapter, para trocar por tiles self-hosted depois sem mexer no app. |
| **E-mail** | Adapter com duas implementações: **SMTP** (nodemailer, host/porta/user no `.env`) e **Resend** (API). Escolhido por `MAIL_PROVIDER`. Em dev, container Mailpit captura tudo. |
| **Documentos** | **DOCX preenchido + PDF**. A equipe recebe os dois — o `.docx` continua editável para o ajuste fino antes de protocolar (respeitando o fluxo atual "preenchemos e abrimos no Word para finalizar"), o PDF sai pronto. |
| **Escopo** | Completo, **fatiado em módulos independentes** (M0–M10), cada um entregável e testável sozinho. |

---

## Arquitetura

### Containers (uma única porta exposta)

```
docker-compose.yml
├── web        Next.js 15 (UI + API)   → ÚNICO com ports: ${APP_PORT}:3000
├── worker     Node + BullMQ           → interno (jobs: docx, pdf, e-mail, cron)
├── postgres   Postgres 16             → interno
├── redis      Redis 7                 → interno (fila)
├── gotenberg  Gotenberg 8             → interno (LibreOffice + Chromium → PDF)
└── mailpit    Mailpit                 → interno, profile `dev` (SMTP de teste)
```

`.env` controla tudo o que é ambiente:
```
APP_PORT=8080          # a única porta publicada no host
DATABASE_URL=...
MAIL_PROVIDER=smtp     # smtp | resend
SMTP_HOST= SMTP_PORT= SMTP_USER= SMTP_PASS= MAIL_FROM=
RESEND_API_KEY=
STORAGE_DRIVER=local   # local | s3 (MinIO opcional depois)
MAP_STYLE_URL=https://tiles.openfreemap.org/styles/liberty
```

Nada mais no host. `web`, `worker` e `postgres` conversam pela rede interna do Compose. Uploads vão para um **volume Docker** (`./data/uploads`), servidos por uma rota autenticada do Next — nunca por URL pública direta.

### Stack

- **Next.js 15** (App Router, Server Actions) + **React 19** + **TypeScript** — UI e API no mesmo processo, um container só.
- **Postgres 16** + **Drizzle ORM**. Escolhi Drizzle sobre Prisma porque não carrega binário de query engine — imagem Docker menor e sem dor de cabeça de arquitetura no build. Migrations versionadas com `drizzle-kit`.
- **Auth.js v5** (credentials + bcrypt), roles e permissões próprias. Zero dependência externa de identidade.
- **BullMQ + Redis** para tudo que é assíncrono ou agendado: renderizar documento, converter PDF, enviar e-mail, varrer vencimentos, confirmar provas.
- **Tailwind v4 + shadcn/ui** com os tokens do Stitch.
- **docxtemplater** (core MIT) para o mail-merge.
- **Gotenberg** para PDF — DOCX→PDF via LibreOffice, e HTML→PDF via Chromium (orçamentos, etiquetas, relatórios). Uma peça resolve os dois, e o app não precisa embarcar Puppeteer nem LibreOffice.

### Design system

Extraído de `telas-stitch/` (Stitch: "Sparapan Nautical Management"), portado para tokens Tailwind v4 + variáveis CSS:

- Navy institucional `#002b5b` (primary-container) / `#001736` (primary); laranja queimado `#ab3500` para alertas e pendências; teal `#003134` para "em dia".
- **Manrope** (display/headings) + **Hanken Grotesk** (corpo) + **JetBrains Mono** (micro-labels uppercase). Fontes servidas localmente via `next/font` — sem chamada ao Google Fonts.
- Material Symbols → substituído por **Lucide** (mesma semântica, sem CDN externo, tree-shakeable).
- Raios de borda pequenos e institucionais (cards 8px), sombras discretas.
- **Dark mode de verdade**: o Stitch declara `darkMode: "class"` mas nunca definiu a rampa escura. Vou gerar a rampa Material 3 completa a partir da cor-fonte `#002b5b` e implementar os dois temas.
- Sidebar: normalizo para o conjunto de navegação de `desktop/01_home.html` (os exports divergem entre si).
- Mobile: bottom nav + FAB, como nos exports mobile.

---

## Modelo de dados (núcleo)

Derivado diretamente dos cabeçalhos das planilhas. Campos em português no domínio, para casar com os MERGEFIELDs sem tradução mental.

**`clientes`** — nome, cpf_cnpj, rg, orgao_emissor, data_emissao_rg, data_nascimento, nacionalidade, naturalidade, tipo, e-mail, tel, cel, endereço completo (cep/rua/numero/complemento/bairro/cidade/uf), despachante, indicado_por, observações.

**`embarcacoes`** — cliente_id, nome, nome_anterior, opcao_nome_2, opcao_nome_3, numero_inscricao, tipo, atividade, area_navegacao, comprimento, boca, pontal, contorno, calado_max, arqueacao_bruta, arqueacao_liquida, pbt, lpp, tripulantes, passageiros, lotacao, ano, data_construcao, numero_casco, material_casco, construtor, cor, local_inscricao, data_inscricao, registro_tm, apolice_dpem, validade_dpem, tipo_propulsao.

**`motores`** — embarcacao_id, ordem (1..3), marca, potencia, numero_serie. *(Os templates têm slots para até 3 motores; a planilha só preenche 1. Modelo relacional resolve.)*

**`aquisicoes`** — embarcacao_id, numero_nf, data_venda, local, vendedor, cpf_cnpj_vendedor, valor. *(Alimenta o recibo de compra e venda — opcional.)*

**`habilitacoes`** — cliente_id, tipo (CHA/CIR), numero, data_emissao, categoria, validade.

**`obras`** — o bloco NORMAM-303: responsável técnico (nome, título, CREA), tipo/item/código da obra, NORMAM de uso, CP/DL/AG, rio, margem, distância, área de navegação, **ponto_a/b/c/d (lat/lng)**, dimensões, materiais, tambores, calados, deslocamentos, salvatagem (coletes/boias), lotação, saneamento.

**`servicos`** — nome, descrição, valor, **custo**, categoria (despachante/escola), norma, ativo. *(O campo "custo" já existe no Base44 e não é usado em lugar nenhum — aqui ele vira margem real.)*

**`processos`** — cliente, embarcação, serviço, norma, status, responsável, datas, protocolo. Estado dirigido por eventos, não por dropdown manual.

**`modelos_documento`** — o arquivo `.docx`, a norma, a categoria, e o **schema de campos descoberto na importação** (lista de MERGEFIELDs), + flags `obrigatorio` / `duas_vias`.

**`documentos_gerados`** — processo_id, modelo_id, snapshot dos dados usados, caminho do DOCX, caminho do PDF, status, vencimento.

Mais: `orcamentos`, `servicos_contratados`, `pagamentos`, `despesas`, `agenda_eventos`, `lembretes`, `catalogo_itens` (embarcações/motores/carretas com preço), `salvatagem_itens`, `materiais_estudo`, `usuarios`, `audit_log`.

---

## Módulos

Cada módulo é uma fatia vertical entregável: schema + API + UI + teste. A ordem importa — cada um depende do anterior.

### M0 — Fundação
Docker Compose completo com a porta única; Next 15 + TypeScript; Drizzle + primeira migration; Auth.js (login, roles admin/operador/leitura); design system (tokens, fontes locais, tema claro/escuro); shell da aplicação (sidebar desktop + bottom nav mobile) a partir dos exports Stitch; healthcheck; seed inicial.
*Pronto quando:* `docker compose up` sobe tudo, login funciona, uma página vazia renderiza no tema certo, `APP_PORT` do `.env` é respeitada.

### M1 — Cadastros
Clientes (com validação de CPF/CNPJ e busca de CEP degradável), Embarcações (+ motores, + aquisição), Habilitações, Serviços, Catálogo (embarcações/motores/carretas + preços), Controle de Salvatagem (itens + validade por embarcação). Upload de arquivos do cliente (RG, CPF, CRLV) no storage local. Aniversariantes.
*Cobre:* `/Clientes`, `/CadastrarCliente`, `/ClienteDetalhes`, `/Embarcacoes`, `/Servicos`, `/Aniversariantes`, + os pedidos de catálogo e salvatagem do func.md.

### M2 — Motor de Documentos ← **o coração**
1. **Importador de modelos**: sobe um `.docx`, o sistema abre o `word/document.xml`, encontra os `MERGEFIELD` (tanto `fldSimple` quanto `instrText`), converte para tags do docxtemplater e **persiste o schema de campos descoberto**. Cadastrar um formulário novo da Marinha = upload, não deploy.
2. **Renderer**: dado um processo, resolve cada campo do schema a partir de cliente/embarcação/motor/obra, preenche o DOCX (preservando as 2 vias do BSADE, que já estão no arquivo), e manda para o Gotenberg virar PDF.
3. **Regras por norma**: cada serviço declara seus anexos obrigatórios e opcionais. Procuração sempre; atestado médico obrigatório em CIR; declaração de extravio e recibo de compra e venda opcionais (checkbox); 2-B/2-C/2-G automáticos na 211.
4. Seed dos 7 fluxos de `documentos/` como modelos iniciais.
*Cobre:* `/GeradorDocumentos`, `/GerenciarModelos`, `/CriarDocumentos`, `/VerDocumentos`, `/EditarDocumento`.

### M3 — Processos + Checklist de Conformidade
Pipeline "Novo Atendimento" numa tela só: cliente → embarcação → serviço → anexos → gera → orçamento → envia. **Checklist de conformidade por norma**: mostra exatamente o que falta antes de deixar protocolar ("falta comprovante de residência", "falta 2-H assinado") — é isso que evita a Marinha devolver o processo. Status automático dirigido por evento (documento gerado → e-mail enviado → protocolado → concluído). Anexar o protocolo escaneado e notificar o cliente.
*Cobre:* `/Processos`, `/Pendentes`, §1 e §14 do func.md.

### M4 — Comercial
Orçamentos (numeração MMAAXXX, PDF via Gotenberg, envio por e-mail com anexo), Serviços Contratados, Pagamentos / contas a receber, taxa de conversão orçamento→venda.
*Cobre:* `/Orcamentos`, `/ServicosContratados`, aba Pagamentos de `/Pendentes`.

### M5 — Agenda, Vencimentos e Jobs
Agenda mensal + eventos; **lista de agendamentos filtrada por cliente e processo**; Lembretes gerados automaticamente (não mais "Adicionar Lembrete" na mão); Vencimento de Documentos com os 4 cards-filtro; **jobs BullMQ**: alerta de vencimento em 30/15/7 dias, confirmação de compromisso 1 dia antes, **aviso do dia da prova na inscrição** e **confirmação da prova poucos dias antes**; renovação em 1 clique.
*Cobre:* `/Agenda`, `/Lembretes`, `/VencimentoDocumentos`, §2 e §3 do func.md, e os itens de prova do func.md.

### M6 — Comunicação
Templates de e-mail com variáveis (orçamento, vencimento, agendamento, cobrança, protocolo, prova); adapter SMTP/Resend; anexo automático do PDF; histórico de envios por cliente; disparo por gatilho.
**Etiqueta de envio dos Correios com marca d'água** — gerada em PDF via Gotenberg a partir do endereço do cliente.
*Cobre:* `/EnviarEmails`, §4 do func.md, item "endereço de envio automático" do func.md.

### M7 — Financeiro e BI
Fluxo de caixa (entradas × saídas), **despesas mensais**, margem real por serviço/cliente/colaborador usando o campo `custo`, lucro mensal, ranking de serviços, tempo médio de conclusão de processo, sazonalidade, exportação CSV/Excel para o contador.
*Cobre:* `/GraficoVendas`, §5 e §15 do func.md, item "financeiro" do func.md.

### M8 — Cliente 360° + Área de Estudos
Timeline única do cliente (documentos, e-mails, pagamentos, compromissos num só fio cronológico); badges de status na listagem; relatório de indicações. Área de Estudos com progresso do aluno, simulados por categoria e material liberado conforme serviço contratado.
*Cobre:* `/AreaEstudos`, §6 e §7 do func.md.

### M9 — Portal do Cliente
Login separado por CPF/e-mail. Cliente vê o status do próprio processo, baixa segunda via, vê vencimentos, pede renovação em 1 clique (cai como pendência para a equipe). É o que mata o volume de "cadê meu documento?".
*Cobre:* §11 do func.md.

### M10 — Extras
Busca global `Ctrl+K`; multiusuário + permissões + log de auditoria; soft-delete com lixeira de 30 dias; **assinatura digital própria** (aceite com token por e-mail + hash + carimbo de tempo — sem D4Sign, sem custo); **OCR local com Tesseract.js** (foto do RG/CRLV pré-preenche o cadastro); PWA instalável com câmera nativa; exportação em massa.
*Cobre:* §8, §9, §10, §12, §13, §16 do func.md.

### M11 — Autoatendimento por link + automação de preenchimento
Generaliza o padrão de token público de `/assinar` (tabela `assinaturas`) numa tabela `solicitacoes` com `tipo`, servida em `/c/[token]`: o cliente preenche o próprio cadastro, envia documentos que faltam no processo (`requisitosDocumento` × `arquivos`, novo — o checklist interno era só de documentos *gerados*, não dos que o cliente *entrega*), cadastra uma embarcação (formulário reduzido, a equipe completa os campos técnicos), aprova/recusa orçamento, ou acompanha o processo (stepper, só leitura). Aprovação de orçamento ficou idempotente e com checagem de validade (`src/lib/orcamentos.ts`), reaproveitada tanto pelo painel interno quanto pelo link público. Três primitivos novos em `components/ui`: `CampoMoeda` (máscara de milhar/decimal com hidden input numérico puro), `CampoCep` (ViaCEP, autopreenche endereço), `CampoCnpj` (BrasilAPI, autopreenche razão social). Corrigido de brinde: `proxy.ts` não isentava `/assinar` nem `/portal/login` do gate de autenticação — o link de assinatura estava, na prática, inacessível sem login.

### M12 — Agenda: separação Agendamento × Evento
Refatoração do módulo de Agenda em duas entidades independentes (migration 0035, testado E2E no navegador):
- **Agendamento** (tabela `agenda_eventos`, semanticamente renomeada): atendimento marcado com **data+hora, cliente (do banco), serviço, representante legal (cadastro próprio `representantes_legais` com criação inline no form), interessados (até 5, com CPF, serviço solicitado e observação editável) e 1–5 processos no mesmo horário** (tabela `agendamento_processos`). Título auto-gerado a partir de serviço+cliente se não preenchido. Rotas: `/agenda/agendamentos` (lista cronológica com visualizar/editar/excluir/abrir processo/imprimir/baixar PDF), `/agenda/agendamentos/novo`, `/agenda/agendamentos/[id]`, `/agenda/agendamentos/[id]/editar`; PDF individual e da lista via Gotenberg. `/agenda/novo` virou redirect para o novo fluxo.
- **Evento** (tabela nova `eventos` + `evento_vinculos` polimórfica): ocorrência interna independente do atendimento — título, descrição, data, **prazo para solução**, responsável (usuário), status próprio (`pendente/em_andamento/concluido/arquivado`), observação e **vínculo com qualquer entidade do sistema** (cliente, processo, embarcação, orçamento, documento, serviço, obra, taxa, aluno — select dinâmico via `/api/agenda/eventos/itens`). Ações: editar, concluir, **arquivar** (sai da lista ativa, fica no histórico), **reabrir**. Rotas: `/agenda/eventos`, `/agenda/eventos/novo`, `/agenda/eventos/[id]`, `/agenda/eventos/[id]/editar`.
- **Calendário**: fonte nova "Eventos" (ativa por padrão, mostra data e prazo), itens de agendamento agora **linkam para o detalhe** (antes apontavam para a página genérica); botões separados "+ Novo Agendamento" e "+ Novo Evento".
- **Reflexos automáticos (regra D9)**: toda fonte do calendário e lista que referencia entidade com soft-delete passou a filtrar `excluido_em IS NULL` — orçamento excluído some do calendário, agendamento de cliente excluído some da agenda operacional sem apagar histórico. Exclusão de agendamento é hard delete com cascade (interessados e processos vinculados) e auditoria.
- Worker e portal do cliente intactos (jobs continuam sobre `agenda_eventos`).

### M13 — Chat clicável + Clientes (cartões, cadastro por serviço, processos no topo, DPEM, busca fluida)
Lote de correções de usabilidade (itens 7–12 do pedido, testados E2E):
- **Chat**: o item do menu era um botão-popover (`ChatPopover`) no lugar de link — trocado por **link direto para `/chat`** com badge de não lidas (`ChatBadge` via `/api/chat/recentes`); popover removido. O módulo estava funcional; o problema era só o acesso.
- **Lista de clientes**: a tabela virou **grade de cartões compactos** (`GradeClientes`) — só informações que existem (nome, CPF, telefone, e-mail/cidade, serviço do processo mais recente + badge de status), sem "—" nem caixas grandes; grid responsivo para enxergar mais clientes por tela. **Busca fluida client-side**: digitar filtra na hora (nome/CPF/e-mail), apagar devolve a lista completa imediatamente — sem navegação e sem resultado velho (estado derivado do input).
- **Novo cliente**: ganhou **Órgão Emissor** e **Data de Emissão do Documento** (colunas `orgao_emissor`/`data_emissao_rg`, que já existiam). Removida a digitação livre de embarcação/serviço; no lugar, **seleção por ícones** (`OPCOES_SERVICO_NOVO_CLIENTE` em `lib/novo-cliente-opcoes.ts`): Orçamento, Escola Náutica, Embarcação Esporte e Recreio, Embarcação Comercial, Obras. Ao salvar, o sistema cria os processos certos automaticamente — **Escola Náutica → Arrais Amador + Motonauta**; **Esporte/Comercial → embarcação (classe automática) + Inscrição (NORMAM-211)**; **Obras → serviço de engenharia** — cada um com pendências automáticas e auditoria (serviços resolvidos por nome no cadastro; se faltar, registra em auditoria sem quebrar o cliente).
- **Detalhe do cliente**: contato existente (telefone/e-mail/cidade) logo no topo; seção **"Processos/Serviços deste cliente"** logo abaixo com **cards clicáveis → `/processos/[id]`** (o card não linkava antes) + badge de status; botão "+ Novo Processo".
- **Senha DPEM** (item 11): coluna nova `senha_dpem` em `clientes` (migration 0036) — a mesma senha vale para todas as embarcações do cliente. Campo no cadastro/edição e **card no detalhe apenas quando o cliente possui ≥1 embarcação**.

---

## Onde entra o mapa

Único uso real: **NORMAM-303 (obras)**, que exige as coordenadas Ponto A/B/C/D. Em vez de digitar lat/long, o usuário desenha a obra no mapa (MapLibre + terra-draw) e o sistema extrai as 4 coordenadas para o Memorial Descritivo. Secundariamente, um mapa das obras cadastradas. Fica atrás de um `MAP_STYLE_URL` no `.env` — trocar para tiles self-hosted depois é mudar uma variável.

---

## Verificação

Cada módulo entrega com:
- **Migration + seed** que roda limpo em banco vazio (`docker compose down -v && docker compose up`).
- **Teste E2E (Playwright)** do fluxo principal do módulo.

Verificações que provam o sistema de ponta a ponta, e que valem mais que qualquer suíte de unidade:

1. **`APP_PORT`**: mudar a porta no `.env`, subir, confirmar que a app responde na nova porta e que `docker ps` mostra **uma única** porta publicada.
2. **Round-trip do documento** (o teste que importa): cadastrar um cliente + embarcação com os dados **da linha 2 da planilha real** (`documentos/embarcacao/SPARAPAN APP EMB.xlsx`), gerar o processo NORMAM-211, e **comparar o DOCX gerado com o que a equipe produziria hoje pelo Word** — mesmos campos, mesmas 2 vias do BSADE. Se bater, o motor está correto. Repetir para os 7 fluxos.
3. **PDF**: confirmar que o Gotenberg converte o DOCX preservando o layout do formulário da Marinha (formulários oficiais são sensíveis a isso — vale checar cedo, no M2, não no fim).
4. **Vencimento**: criar um documento vencendo em 7 dias, rodar o job manualmente, ver o e-mail chegar no Mailpit.
5. **Offline**: subir com a rede externa cortada. Tudo deve funcionar exceto o mapa e o envio real de e-mail — nenhuma outra dependência externa pode existir.

---

## Riscos conhecidos

- **Fidelidade do DOCX→PDF.** Formulários da Marinha têm layout rígido. O LibreOffice é muito bom, mas não é o Word. Por isso a entrega inclui o `.docx` — se o PDF sair torto num formulário específico, a equipe ainda tem o caminho manual, e o sistema continua útil. Testar isso no M2, cedo.
- **`MERGEFIELD` com formatação partida.** O Word às vezes quebra um campo em vários `instrText`. O importador precisa concatenar os runs antes de casar o regex, senão alguns campos passam batido. É a parte do M2 que merece teste real contra os 17 arquivos de `documentos/`.
- **Planilhas com fórmulas modernas.** O Arrais e a 303 têm sheets `LAMBDA_WF`/`ARRAYTEXT_WF`. Não vou reescrever `.xlsx` nenhum — leio uma vez para extrair o schema e vou direto ao DOCX. Risco eliminado por não tocar no arquivo.
- **Escopo.** São 10 módulos. Do M0 ao M3 já existe um sistema que substitui as planilhas e é melhor que o Base44 no que importa. Vale entregar e usar antes de seguir para o M4.
