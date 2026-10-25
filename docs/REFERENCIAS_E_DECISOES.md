# Referências e decisões técnicas

Registro sanitizado. As referências orientam conceitos; nenhuma das quatro aplicações será combinada ao Atlas ou considerada auditada integralmente.

## Base própria

Escolha: React/TypeScript/Vite com Dexie e contratos próprios de domínio e sincronização. É uma aplicação estática pequena, com regras financeiras e autorização explícitas. Adaptar uma aplicação inteira introduziria modelo, infraestrutura, migrações e decisões de sincronização que ainda precisariam ser verificados e modificados.

| Referência | Uso conceitual | Limite |
|---|---|---|
| [Finance OS](https://github.com/NafisianCastle/finance-os) | Organização de PWA, dados locais e sincronização opcional. | Não assumir que presença de Dexie/Supabase comprova outbox idempotente, conflitos seguros ou cálculo monetário correto. |
| [Actual Budget](https://github.com/actualbudget/actual) | Transferências vinculadas, conciliação e recuperação. | Sua sincronização pressupõe infraestrutura própria; software gratuito não implica hospedagem gratuita. [Transferências](https://actualbudget.org/docs/transactions/transfers/) |
| [Firefly III](https://github.com/firefly-iii/firefly-iii) | Relações entre eventos financeiros, importações e prevenção de duplicatas. | Backend e infraestrutura próprios excedem o frontend estático escolhido. |
| [Budget Tracker](https://github.com/1korenn/budget-tracker) | Simplicidade do fluxo móvel. | Não reutilizar políticas de acesso com condições sempre verdadeiras ou sem proprietário. |

Licenças e atribuições precisam ser verificadas no arquivo e revisão exatos antes de qualquer cópia. Neste incremento a implementação é própria; não se incorpora código dessas aplicações.

## Decisões de infraestrutura

- PostgreSQL fornece FKs, restrições e transações para operações compostas. Dexie fornece persistência local e transações do IndexedDB. Nenhum saldo financeiro terá duas fontes independentes de verdade.
- A base local será a fonte de leitura da interface, incluindo pendências identificadas; o servidor manterá o estado confirmado compartilhado. Os contratos detalhados estão em [sincronização](SINCRONIZACAO.md).
- Google OAuth reduz dependência de email transacional. O vínculo inicial a um usuário confirmado preexistente é compatível com cadastro desativado no código analisado do Auth; a integração hospedada continua pendente. [Código de vínculo](https://github.com/supabase/auth/blob/c3348e8f1cb31454e9783e4eb9eab1e71ad9652f/internal/api/external.go#L314)
- A autorização é por UUID e autorização administrativa ativa, não por uma lista de emails no navegador. Escopos básicos do Google podem dispensar a lista de test users; ela não protege os dados do Atlas. [Audiência OAuth](https://support.google.com/cloud/answer/15549945?hl=en)
- O custo dos serviços foi pesquisado em documentação oficial; não há validação das contas reais. Ver [custos e limites](CUSTOS_E_LIMITES.md).
