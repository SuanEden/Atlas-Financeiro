# Validação dos Incrementos 1 e 2

Validação executada em 26/10/2026, no Windows, com Node.js 22.13.0 e npm 10.9.2. As dependências foram instaladas a partir de `app/package-lock.json` por `npm ci`; a auditoria do npm informou zero vulnerabilidades conhecidas naquele momento.

## Comandos e resultados

Executados a partir de `app/`:

| Comando | Resultado observado |
|---|---|
| `npm run typecheck` | Concluído sem erros. |
| `npm test` | 8 arquivos aprovados; 109 testes enumerados, 108 aprovados e 1 ignorado pela ausência do manifesto privado. |
| `npm run build` | Concluído; build Vite estático gerado sem sourcemaps. |
| `npm run test:browser` | 10 testes aprovados em Edge, nos perfis desktop e móvel. |
| `npm run test:pwa` | Build de produção e 1 cenário offline aprovado: shell e dados IndexedDB preservados após recarga sem rede. |
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

- O teste de igualdade/hashes dos quatro documentos privados está ignorado porque o manifesto e os originais não existem nesta VM. Exclusão do Git e não exposição continuam aprovadas.
- O SQL foi somente revisado como artefato de referência; não houve PostgreSQL, Supabase, RLS ou RPC em execução.
- Google OAuth, usuário pré-cadastrado, cadastro desativado, conta não autorizada e usuário autenticado sem autorização são testes obrigatórios futuros, não executados.
- Não houve teste de autenticação, sincronização remota, restauração completa, gerações, deploy ou serviços externos, pois permanecem fora dos Incrementos 1 e 2.
