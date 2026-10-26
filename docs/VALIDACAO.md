# Validação dos Incrementos 1 e 2

Validação executada em 26/10/2026, no Windows, com Node.js 22.13.0 e npm 10.9.2. As dependências foram instaladas a partir de `app/package-lock.json` por `npm ci`; a auditoria do npm informou zero vulnerabilidades conhecidas naquele momento.

## Comandos e resultados

Executados a partir de `app/`:

| Comando | Resultado observado |
|---|---|
| `npm run typecheck` | Concluído sem erros. |
| `npm test` | 9 arquivos aprovados; 116 testes enumerados, 115 aprovados e 1 ignorado pela ausência do manifesto privado. |
| `npm run build` | Concluído; build Vite estático gerado sem sourcemaps. |
| `npm run test:browser` | 14 testes aprovados em Edge, nos perfis desktop e móvel. |
| `npm run test:pwa` | Build de produção e 2 cenários aprovados: gravação offline com outbox e atualização do worker com preservação dos dados. |
| `npm run check` | Fluxo sequencial completo aprovado: unitários, typecheck/build, navegador e PWA offline. |

Uma execução em cache frio revelou que a descoberta tardia do Dexie pelo Vite podia recarregar a página durante o `page.evaluate` do primeiro perfil. O caso foi reproduzido, e `vite.config.ts` passou a pré-otimizar o Dexie na inicialização. A validação final inclui execução sem cache prévio e repetições da suíte. `npm run check` serializa unitários, build, navegador de desenvolvimento e PWA de produção.

## Evidências cobertas

- Entrada brasileira convertida como texto, formatação BRL exata, negativos/formatos inválidos e limites.
- Casos de referência: `50,00 − 18,00 = 32,00`; `13,00 + 6,82 + 29,99 = 49,81`; `186,62 + 36,30 = 222,92`; `775,08 + 428,63 = 1.203,71`.
- Soma acima de `Number.MAX_SAFE_INTEGER`, preservação de um centavo, rateio com resto e arredondamento em pontos-base.
- JSON versionado com centavos positivos e negativos em strings canônicas; rejeição de números JSON e campos desconhecidos.
- Reabertura do IndexedDB mantendo `bigint`, tanto em `fake-indexeddb` quanto no navegador real.
- Rollback de falha na última coleção, preservando o estado anterior, em `fake-indexeddb` e no IndexedDB nativo.
- Isolamento de bases por proprietário, rejeição de propriedade misturada, referências ausentes e IDs duplicados.
- Previsões não alteram caixa; saldo inicial é ajuste e não renda; transferências exigem duas contrapartidas opostas e não mudam o patrimônio total.
- Datas de competência, pagamento e liquidação são distintas; liquidação parcial não reconhece o total como pago.
- O servidor de desenvolvimento restringe sua raiz a `app/`, recusa nomes privados e não serve `.git`, `.private`, `.env` ou documentos originais. O bundle não contém dados financeiros pessoais conhecidos.
- Conta com saldo inicial e categoria criadas pela interface; despesa de `R$ 18,00` sobre `R$ 50,00` resulta em `R$ 32,00` e permanece após recarga.
- Correção de `R$ 18,00` para `R$ 20,00` cria original, estorno e substituição; o saldo passa a `R$ 30,00` sem apagar o histórico.
- Transferência e respectivo estorno preservam as duas contrapartidas e o patrimônio total; reserva simples usa conta `reserved`.
- Operação financeira e outbox sofrem commit ou rollback juntas, inclusive quando a escrita final na outbox falha.
- Backup baixado no navegador contém manifesto, centavos em strings e operações pendentes; a interface deixa explícito que restauração ainda não existe.
- PWA de produção registra service worker, reabre offline e mantém os dados financeiros persistidos no IndexedDB.

## Limitações reais

- Os testes de interface usam Edge/Chromium no Windows: desktop 1280×900 e celular emulado 390×844. Não houve aparelho Android físico, instalação pela interface do Chrome Android, teclado Android real, leitor de tela, Safari ou Firefox. O manifesto e os PNGs 192/512 foram conferidos; isso não comprova instalação em todo aparelho.
- Dashboard filtra o fluxo pelo mês financeiro atual, sem seletor de período/conta/categoria nesta interface. A regressão usa fevereiro e os unitários cobrem meses de 28, 29, 30 e 31 dias; cálculos de domínio preservam limites inclusivos. Não há previsão de saldo futuro apresentada como disponível.
- Não se executou o ciclo exportar → restaurar → comparar: importação, prévia, substituição e gerações pertencem a I4. I2 não aceita arquivos de entrada nem modifica a base a partir de arquivos.

- O teste de igualdade/hashes dos quatro documentos privados está ignorado porque o manifesto e os originais não existem nesta VM. Exclusão do Git e não exposição continuam aprovadas.
- O SQL foi somente revisado como artefato de referência; não houve PostgreSQL, Supabase, RLS ou RPC em execução.
- Google OAuth, usuário pré-cadastrado, cadastro desativado, conta não autorizada e usuário autenticado sem autorização são testes obrigatórios futuros, não executados.
- Não houve teste de autenticação, sincronização remota, restauração completa, gerações, deploy ou serviços externos, pois permanecem fora dos Incrementos 1 e 2.

## Revisão complementar de I2 — 26/10/2026

Continuação na branch existente `codex/incremento-2-local-finance`, a partir de `35e6a4e`, com worktree inicialmente limpo. `main` ainda continha I1. Nenhuma alteração anterior foi descartada. Browser plugin not available; foi usado o Playwright já instalado com Edge. Não foram adicionadas dependências.

Fluxo principal sob teste: primeiro uso vazio → conta/categoria → receitas e despesas realizadas/previstas → correção/realização da previsão → estorno/cancelamento → histórico/dashboard → exportação → recarga e nova aba no mesmo perfil.

| Verificação de interface | Evidência observada |
|---|---|
| Identidade e conteúdo | Título Atlas Financeiro, rota local e tela inicial com conteúdo real, sem overlay do Vite. |
| Console | Sem erros ou avisos da aplicação nos cenários que os monitoram; avisos de cores do runner e 403 deliberado do teste de privacidade não são erros da aplicação. |
| Celular e desktop | Capturas inspecionadas de início vazio, dashboard, conta, categoria, formulário, erro, confirmação, histórico, contas e exportação. |
| Teclado | Valor recebe foco inicial; sequência de Tab fica no diálogo; Escape fecha e devolve foco. Erro de valor inválido mantém campos e rola a mensagem para área visível. |
| Integridade | Submissão repetida no mesmo ciclo produz uma única receita. Histórico mantém originais, estornos e substituições; conta e categoria não se perdem. |
| Arquivo exportado | JSON baixado efetivamente lido: 1 conta, 1 categoria, 9 eventos, 6 liquidações e 10 pendências; soma exata das contrapartidas de 8.700 centavos após o fluxo completo. |
| Outra aba | Uma segunda aba acrescenta uma conta; a exportação solicitada na aba antiga relê o IndexedDB e inclui as 2 contas e 11 pendências, mesmo com snapshot visual anterior. |
| Reabertura | Nova aba no mesmo contexto IndexedDB mantém saldo de R$ 87,00, 9 eventos e 10 operações pendentes. |
| Outbox | Reabertura e reenvio do mesmo comando não duplicam dados; payload divergente é rejeitado; falha na escrita final desfaz todo o agregado. |
| PWA de produção | Worker pronto, recarga offline, despesa offline de 1 centavo, nova recarga com R$ 49,99 e duas pendências preservadas. |
| Atualização | Servidor local isolado oferece versões N/N+1 do HTML/worker. A nova versão espera com formulário aberto; depois de fechar a aba, assume a versão nova com saldo e pendência intactos, inclusive offline. Cache antigo é removido. |

Defeitos encontrados e corrigidos: fim mensal fixo em dia 31; foco inicial e ciclo de Tab nos diálogos; ação inferior do formulário cortada; baixo contraste de ações no tema escuro; falta de trava síncrona contra gravação repetida; payload de outbox desacoplado do agregado; exportação baseada no snapshot visual em vez de reler a base; cache sem versão por conteúdo. O primeiro teste do novo cache falhou por `Vary: Origin` nos ativos estáticos do preview; a busca por ativos estáticos pré-cacheados passou a ignorar `Vary`, preservando correspondência de URL.

O teste antigo de transferência dependia da ordem dos IDs no IndexedDB e, com UUIDs aleatórios, podia selecionar a conta reservada como origem. Foi corrigido para selecionar origem e destino pelos nomes, sem alterar a regra financeira. A ação de transferir agora abre diretamente o formulário de transferência.

Além de `npm run check`, foi executada QA temporária com Playwright sobre o build em `http://127.0.0.1:4173`, em 390×844 e 390×480: valor máximo de R$ 999.999.999,99 sem rolagem horizontal, contas, tema escuro e ação Salvar inteiramente visível com viewport reduzido. Esse ensaio simula pouco espaço vertical, não um teclado Android real. Capturas e script ficaram no diretório temporário do sistema, fora do Git; os testes reproduzíveis ficam no repositório.

`npm ci` concluiu com zero vulnerabilidades reportadas pelo npm. Tentativas iniciais de npm/Node/Git falharam por permissões do sandbox; a instalação e a validação foram depois executadas com acesso permitido. As falhas intermediárias de seletores de teste, foco, cache e ordem de contas foram corrigidas; somente a execução final bem-sucedida é o critério de entrega. `git diff --check` foi executado na revisão final. Nenhum teste foi ignorado além do manifesto privado ausente.

Uma tentativa da suíte PWA foi interrompida por porta 4173 ocupada pelo preview usado na inspeção visual. O preview foi encerrado antes da execução final, sem mudar a política de isolamento dos testes. No PowerShell deste ambiente, a chamada interativa com argumentos adicionais de host/porta não foi encaminhada corretamente pelo wrapper npm; `npm run preview` usa os valores corretos já definidos no Vite e foi o comando utilizado na inspeção.

Revisão dos arquivos preparados: somente código, testes, ícones próprios e documentação sanitizada; nenhum `.env`, banco, exportação, dependência, build, screenshot ou arquivo temporário preparado. Busca de padrões de credenciais conhecidas no patch não encontrou ocorrências. Essa busca não constitui auditoria de segurança integral. A execução final de `npm run check` concluiu todas as etapas com código 0; não há serviço local necessário para recuperar a entrega a partir do GitHub.

Entrega remota: `git fetch origin` e `git ls-remote` funcionaram. `git push origin HEAD:refs/heads/codex/incremento-2-local-finance` aguardou credencial e foi interrompido; nova tentativa com prompt desabilitado falhou explicitamente por falta de autenticação. Nenhum commit novo foi confirmado no remoto nesta tentativa. O pacote alternativo pode ser verificado com `git bundle verify .private/entrega/atlas-i2-checkpoints.bundle` e recuperado com `git clone -b codex/incremento-2-local-finance <caminho-do-bundle> Atlas-Financeiro-recuperado`. Após clonar, adicionar/configurar `origin` para o GitHub antes de enviar. A confirmação de push permanece pendente.
