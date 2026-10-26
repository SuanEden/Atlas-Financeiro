# Validação do Incremento 1

Validação executada em 26/10/2026, no Windows, com Node.js 22.13.0 e npm 10.9.2. As dependências foram instaladas a partir de `app/package-lock.json` por `npm ci`; a auditoria do npm informou zero vulnerabilidades conhecidas naquele momento.

## Comandos e resultados

Executados a partir de `app/`:

| Comando | Resultado observado |
|---|---|
| `npm run typecheck` | Concluído sem erros. |
| `npm test` | 5 arquivos aprovados; 99 testes enumerados, 98 aprovados e 1 ignorado pela ausência do manifesto privado. |
| `npm run build` | Concluído; build Vite estático gerado sem sourcemaps. |
| `npm run test:browser` | 8 testes aprovados em Edge, nos perfis desktop e móvel. |
| `npx playwright test --repeat-each=3` | 24 execuções aprovadas após a correção da inicialização do Dexie. |
| `npm run check` | Fluxo sequencial completo aprovado: testes, typecheck/build e navegador. |

Uma execução em cache frio revelou que a descoberta tardia do Dexie pelo Vite podia recarregar a página durante o `page.evaluate` do primeiro perfil. O caso foi reproduzido, e `vite.config.ts` passou a pré-otimizar o Dexie na inicialização. A validação final inclui execução sem cache prévio e repetições da suíte. `npm run check` serializa testes, build e navegador.

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

## Limitações reais

- O teste de igualdade/hashes dos quatro documentos privados está ignorado porque o manifesto e os originais não existem nesta VM. Exclusão do Git e não exposição continuam aprovadas.
- O SQL foi somente revisado como artefato de referência; não houve PostgreSQL, Supabase, RLS ou RPC em execução.
- Google OAuth, usuário pré-cadastrado, cadastro desativado, conta não autorizada e usuário autenticado sem autorização são testes obrigatórios futuros, não executados.
- Não houve teste de sincronização, restauração completa, gerações, PWA, deploy ou serviços externos, pois estão fora do Incremento 1.
