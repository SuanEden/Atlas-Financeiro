# Arquitetura

## Fundação do Incremento 1

O frontend estático usa React, TypeScript e Vite. O domínio financeiro não depende de React, navegador, Dexie ou Supabase: recebe um conjunto de dados válido, aplica regras exatas e devolve resultados. A interface mínima identifica o estado da fundação; não representa um dashboard financeiro pronto.

```text
Interface React
    ↓ chamadas de aplicação
Domínio puro: modelos → validação → cálculos em bigint
    ↓ fronteira de persistência
LocalFinancialStore → transação Dexie → IndexedDB por proprietário

Futuro I3: outbox → RPC autorizada → PostgreSQL → mudanças incrementais
Futuro I4: arquivo de backup → prévia → geração nova → troca atômica
```

Responsabilidades:

- **Domínio:** valores em centavos, datas financeiras, propriedade, referências e integridade de eventos/liquidações/contrapartidas.
- **Persistência local:** inserção atômica de agregados e leitura de snapshot consistente, sempre para o proprietário configurado. I1 não oferece edição, exclusão, outbox ou login.
- **Serialização:** centavos em strings decimais canônicas nos limites JSON. IndexedDB usa clonagem estruturada, preservando `bigint`.
- **Interface:** apresentação e interação. Não calcula saldos por conta própria nem altera tabelas diretamente.

O adaptador I1 usa uma base IndexedDB por proprietário, nomeada a partir de identificador codificado. Dentro de uma transação, lê o estado, valida o agregado resultante e só então insere os registros. Falha em qualquer tabela aborta a operação inteira. IDs existentes não são sobrescritos silenciosamente.

Essa validação completa é deliberadamente simples para a fundação. No crescimento, consultas incrementais e índices serão necessários, preservando o mesmo contrato de integridade. A base local não é autenticação nem proteção contra alguém com acesso ao perfil do navegador.

## Evolução prevista

I2 entrega o fluxo financeiro local e PWA; I3 integrará Supabase; I4 completará recuperação e testes ponta a ponta. A interface lê a base local e já identifica pendências; no futuro distinguirá valores locais dos confirmados remotamente. O servidor será a referência compartilhada entre dispositivos, sem apagar trabalho ainda não enviado.

## Uso financeiro local do Incremento 2

I2 mantém o domínio independente de React e acrescenta uma camada de comandos. Cada comando constrói IDs estáveis, agregado financeiro e registro da outbox; `LocalFinancialStore.commitOperation` valida o estado resultante e grava as seis coleções na mesma transação Dexie.

```text
Formulário React → comando local → agregado + operação pendente
                                  ↓ mesma transação
          contas/eventos/liquidações/postings + outbox no IndexedDB
                                  ↓
                 snapshot → cálculos puros → dashboard/histórico
```

Edição não usa `put` sobre caixa liquidado: cria estorno integral de efeito inverso e evento substituto. Estorno isolado também acrescenta novo evento. Os vínculos `reversesEventId` e `replacesEventId` preservam a trilha; validação rejeita duplicidade, ciclos, divergência de valor/contas e substituição liquidada sem estorno atômico.

A identidade local é um UUID anônimo persistido no `localStorage` apenas para escolher o namespace IndexedDB. Isso não é login ou autorização. A outbox indica operações locais pendentes e não simula sincronização.

O PWA registra service worker somente no build de produção. O cache contém o shell estático; os dados financeiros permanecem no IndexedDB. O backup exporta JSON versionado, mas I2 não importa nem restaura arquivos.

O build gera `dist/sw.js` a partir do template `public/sw.js`, com a lista completa de HTML, JS, CSS, manifesto e ícones e um hash do conteúdo. O worker pré-cacheia essa versão e não mistura ativos de builds diferentes. Não há `skipWaiting`: uma atualização espera o fechamento de todas as abas/janelas controladas. O cache antigo é retirado na ativação seguinte; IndexedDB, identidade local e outbox não são apagados. O template em `public/` não deve ser servido como build pronto.

`commitOperation` confere que o payload canônico representa exatamente o agregado antes da transação. Na interface, uma trava síncrona impede gravações concorrentes na mesma instância, além do estado visual ocupado. Reutilizar IDs ou aplicar correções concorrentes continua sujeito à validação transacional, sem sobrescrita silenciosa. Isso não implementa coordenação de sincronização entre abas, prevista para I3.

Separar módulos de interface, aplicação, domínio, persistência, sincronização, autenticação e exportação. Não introduzir SSR, backend permanente, ORM de servidor ou serviços de IA para suprir funções do navegador ou do PostgreSQL. O acesso remoto futuro usará SDK Supabase e RPCs SQL; a organização de schemas e permissões está em [segurança](SEGURANCA_RPC.md).

Telas futuras do MVP: acesso/conferência inicial, início, movimentações, contas, categorias e configurações de sincronização/backup. Navegação inferior no celular e lateral no desktop; ação de adicionar gasto sempre acessível; formulário básico de valor, conta, categoria e descrição, com detalhes opcionais. Modo claro/escuro e acessibilidade fazem parte de I2, não do scaffold I1.

O conjunto de especificações não é uma carga inicial de dados reais. Demonstrações devem ficar separadas; falha de rede nunca aciona dados demonstrativos em lugar de dados do usuário.
