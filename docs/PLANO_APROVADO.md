# Plano aprovado

## Direção

Construir uma base própria pequena com React, TypeScript e Vite; Dexie/IndexedDB para trabalho local; Supabase PostgreSQL/Auth/Storage para persistência remota futura; frontend estático no Cloudflare Pages Free. Prioridade para Android, acesso secundário no computador, `pt-BR`, BRL e `America/Fortaleza`.

Preservar os treze módulos do produto, entregando-os em quatro fases. O MVP corresponde à primeira fase e é dividido em quatro incrementos técnicos. Os Incrementos 1 e 2 foram autorizados e executados; os Incrementos 3 e 4 dependem de nova autorização.

Em 26/10/2026 foi autorizado **somente o planejamento detalhado de I3**. A proposta está em [PLANO_INCREMENTO_3.md](PLANO_INCREMENTO_3.md), com decisões em [PENDENCIAS_INCREMENTO_3.md](PENDENCIAS_INCREMENTO_3.md). Esses documentos não estão aprovados para implementação; o recorte de proteção de recuperação é uma proposta explícita, sem transferência automática de escopo de I4.

## Incrementos do MVP

| Incremento | Entrega e critério de passagem |
|---|---|
| I1 — Fundação local | Preservação dos quatro originais com hashes e exclusões do Git; scaffold mínimo; modelos e domínio puro; centavos exatos e codec JSON; adaptador Dexie mínimo com testes de atomicidade, isolamento por usuário e reabertura; SQL de referência e documentação sanitizada. |
| I2 — Uso financeiro local | Contas, categorias, reservas simples, receitas, despesas e transferências; edição e estorno; dashboard e histórico; PWA, outbox persistente e backup local. Sem apresentar integração remota como concluída. |
| I3 — Identidade e sincronização | Google OAuth restrito, RLS, RPC transacional e sincronização incremental; idempotência, conflitos e isolamento validados com dois usuários/dispositivos. |
| I4 — Recuperação e validação do MVP | Restauração completa, troca de geração dos dados, atualização segura da PWA com pendências, fluxos ponta a ponta e documentação operacional. |

Cada incremento depende de evidências dos testes apropriados. A conclusão de I2 não autoriza executar I3–I4, configurar serviços externos, aplicar SQL remoto ou publicar. Commits e pushes técnicos sanitizados foram autorizados separadamente em 26/10/2026.

## Decisões preservadas

- Registros históricos fornecidos pelo usuário exigirão conferência explícita; não serão seeds, saldos atuais ou pagamentos automáticos.
- Login futuro por Google, sem senha própria do aplicativo ou SMTP pago. Cadastro público desativado; usuário previamente provisionado e autorizado no backend. O primeiro vínculo OAuth precisa ser testado antes de concluir autenticação.
- A base local fica isolada por proprietário. Conta e status financeiro não se confundem com sessão ou estado de sincronização.
- Operações financeiras compostas serão atômicas; alterações preservarão histórico. Sem dupla despesa em transferências ou pagamento de fatura.
- Custo zero é condição de implantação: planos gratuitos, sem cartão, faturamento, upgrades ou dependência de créditos promocionais.
- Backup e exportação independente são obrigatórios; sincronização não substitui backup.

## Próxima tarefa após I2

Revisar as evidências do uso local e, mediante autorização do incremento seguinte, implementar identidade Google restrita e sincronização incremental sobre a outbox existente, com PostgreSQL/RLS/RPC reais e testes integrados de autorização, atomicidade e concorrência.
