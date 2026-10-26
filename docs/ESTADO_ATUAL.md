# Estado atual

Atualizado em 26/10/2026. Este documento registra evidências recuperáveis do repositório e não depende do histórico do chat.

## Situação dos Incrementos 1 e 2

O Incremento 1 — Fundação local e o Incremento 2 — Uso financeiro local estão implementados e permanecem separados da integração remota. A aplicação em `app/` funciona como PWA local, inicia vazia e só armazena no navegador os dados informados pelo usuário.

Componentes existentes:

- dinheiro em `bigint` e centavos inteiros, sem `parseFloat` e sem alteração global de `BigInt.prototype`;
- parsing e formatação BRL, limites por lançamento, somas exatas, percentuais em pontos-base e distribuição determinística de centavos;
- contas, categorias, eventos, liquidações e contrapartidas com validação de proprietário, UUID, datas, referências, sinais e integridade de transferências;
- cálculos de saldo, disponibilidade, caixa e competência, mantendo previsão fora do caixa, saldo inicial fora de renda e transferência neutra no patrimônio total;
- representação JSON versionada, com valores monetários em strings decimais canônicas;
- armazenamento local isolado por proprietário, inserção de agregados em transação, rejeição de sobrescrita e leitura consistente após reabertura;
- referência relacional em `database/modelo_inicial.sql`, deliberadamente não aplicada e não validada em PostgreSQL.
- dashboard e histórico responsivos, com navegação lateral no desktop e inferior no celular;
- criação de contas, categorias, receitas, despesas e transferências, com valores realizados ou previstos;
- reserva simples por conta classificada como `reserved`, alimentada por transferência neutra no patrimônio;
- edição de lançamento por estorno integral mais substituição, e estorno por novo evento de efeito inverso; nenhum registro liquidado é sobrescrito;
- outbox persistente gravada na mesma transação Dexie que o agregado financeiro, ainda sem envio remoto;
- backup JSON local versionado, incluindo histórico e operações pendentes; restauração continua fora do escopo;
- manifest, ícone e service worker para instalação e reabertura offline sem apagar IndexedDB.

Revisão final de I2: período mensal válido também em fevereiro/meses de 30 dias; diálogos com foco no valor, Tab/Escape e retorno de foco; ação inferior acessível no celular; erro visível sem perder preenchimento; dígitos tabulares, foco e contraste nos dois temas; trava síncrona de gravação; payload da outbox conferido contra o agregado; metadados de exportação validados. O shell completo é pré-cacheado por versão de conteúdo, com PNGs de 192/512 e atualização que espera fechar as abas.

Validação final registrada: 115 testes unitários aprovados e 1 ignorado por manifesto privado ausente; typecheck/build aprovados; 14 testes de navegador e 2 de PWA de produção aprovados. A inspeção visual incluiu desktop, celular e viewport reduzido; instalação física no Android permanece não verificada. Detalhes e falhas intermediárias corrigidas estão em [VALIDACAO.md](VALIDACAO.md).

## Limitação dos documentos privados

Os quatro documentos pessoais originais citados no plano (`00_COMECE_AQUI.md`, `PROMPT_CODEX.md`, `REQUISITOS_ATLAS.md` e a versão privada de `REFERENCIAS_E_DECISOES.md`) e o manifesto privado de hashes não estão presentes nesta VM. Seu conteúdo não foi reconstruído nem inferido. As exclusões do Git e as barreiras do servidor de desenvolvimento continuam testadas, mas a igualdade com hashes originais permanece sem verificação nesta execução.

Se esses documentos ainda existirem em armazenamento privado, precisam ser preservados fora da VM descartável. Eles não devem ser enviados ao repositório público. A ausência local não autoriza criar substitutos com dados inventados.

## Fronteiras preservadas

- Não há OAuth, Supabase configurado, RPC remota, envio da outbox, restauração ou gerações implementadas.
- `SECURITY INVOKER`, grants, RLS e autorização ativa são contratos futuros documentados, não resultados validados.
- Nenhum serviço externo foi configurado e nenhum aplicativo foi publicado.
- A autorização de 26/10/2026 permite commits e pushes desta continuação, mas não deploy.

## Próximo passo

Checkpoint de código desta revisão: `cc7a92d` (`Conclui revisao funcional e visual do Incremento 2`), na branch `codex/incremento-2-local-finance`. A documentação final fica no commit imediatamente seguinte. Os checkpoints anteriores `62cb433`, `6fe3003` e `35e6a4e` continuam no histórico. A branch `main` não foi alterada nem mesclada.

Para recuperar somente pelo GitHub, clonar o repositório, selecionar `codex/incremento-2-local-finance`, entrar em `app/`, executar `npm ci` e `npm run check` com Node >=22.12 e Edge instalado. Desenvolvimento abre em `http://127.0.0.1:5173` (`npm run dev`); PWA de produção em `http://127.0.0.1:4173` (`npm run build`, depois `npm run preview`). As bases são por origem/perfil, não são transferidas ao trocar endereço ou navegador. Nenhum banco, dado financeiro ou arquivo exportado integra o GitHub.

A exportação JSON está disponível, inclui histórico e outbox, e não restaura dados. Reservas simples usam contas reservadas; alocações parciais com metas não foram incluídas. A limitação antiga do modelo que prometia reservas parciais em I2 foi alinhada ao contrato efetivamente adotado em `REGRAS_FINANCEIRAS.md`.

Ver [PROXIMA_ETAPA.md](PROXIMA_ETAPA.md) para a retomada e os limites de autorização.

Revisar as evidências em `docs/VALIDACAO.md`. Somente após aprovação explícita, iniciar o Incremento 3 por Google OAuth restrito, autorização ativa, RPCs transacionais e sincronização incremental. A documentação não substitui testes reais em Supabase/PostgreSQL.
