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

I2 entrega o fluxo financeiro local e PWA; I3 integra Supabase; I4 completa recuperação e testes ponta a ponta. A interface lerá a base local e distinguirá valores com pendências dos confirmados remotamente. O servidor será a referência compartilhada entre dispositivos, sem apagar trabalho ainda não enviado.

Separar módulos de interface, aplicação, domínio, persistência, sincronização, autenticação e exportação. Não introduzir SSR, backend permanente, ORM de servidor ou serviços de IA para suprir funções do navegador ou do PostgreSQL. O acesso remoto futuro usará SDK Supabase e RPCs SQL; a organização de schemas e permissões está em [segurança](SEGURANCA_RPC.md).

Telas futuras do MVP: acesso/conferência inicial, início, movimentações, contas, categorias e configurações de sincronização/backup. Navegação inferior no celular e lateral no desktop; ação de adicionar gasto sempre acessível; formulário básico de valor, conta, categoria e descrição, com detalhes opcionais. Modo claro/escuro e acessibilidade fazem parte de I2, não do scaffold I1.

O conjunto de especificações não é uma carga inicial de dados reais. Demonstrações devem ficar separadas; falha de rede nunca aciona dados demonstrativos em lugar de dados do usuário.
