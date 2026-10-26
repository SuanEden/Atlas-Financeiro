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

## Limitação dos documentos privados

Os quatro documentos pessoais originais citados no plano (`00_COMECE_AQUI.md`, `PROMPT_CODEX.md`, `REQUISITOS_ATLAS.md` e a versão privada de `REFERENCIAS_E_DECISOES.md`) e o manifesto privado de hashes não estão presentes nesta VM. Seu conteúdo não foi reconstruído nem inferido. As exclusões do Git e as barreiras do servidor de desenvolvimento continuam testadas, mas a igualdade com hashes originais permanece sem verificação nesta execução.

Se esses documentos ainda existirem em armazenamento privado, precisam ser preservados fora da VM descartável. Eles não devem ser enviados ao repositório público. A ausência local não autoriza criar substitutos com dados inventados.

## Fronteiras preservadas

- Não há OAuth, Supabase configurado, RPC remota, envio da outbox, restauração ou gerações implementadas.
- `SECURITY INVOKER`, grants, RLS e autorização ativa são contratos futuros documentados, não resultados validados.
- Nenhum serviço externo foi configurado e nenhum aplicativo foi publicado.
- A autorização de 26/10/2026 permite commits e pushes desta continuação, mas não deploy.

## Próximo passo

Revisar as evidências em `docs/VALIDACAO.md`. Somente após aprovação explícita, iniciar o Incremento 3 por Google OAuth restrito, autorização ativa, RPCs transacionais e sincronização incremental. A documentação não substitui testes reais em Supabase/PostgreSQL.
