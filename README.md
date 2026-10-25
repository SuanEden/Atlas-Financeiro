# Atlas Financeiro

Aplicação pessoal de gestão financeira com prioridade para celular Android, interface em português brasileiro, valores em BRL e datas financeiras no fuso `America/Fortaleza`.

O **Incremento 1** entrega uma fundação local verificável: projeto React/TypeScript/Vite mínimo, domínio financeiro puro, representação exata em centavos, serialização JSON de `bigint`, persistência Dexie e testes. As telas financeiras, PWA, autenticação, sincronização e restauração completa pertencem aos incrementos seguintes.

## Desenvolvimento local

O projeto de aplicação está em `app/`. Nesse diretório, executar `npm ci`, `npm run dev`, `npm run typecheck`, `npm test` e `npm run build`, conforme os scripts disponíveis em `package.json`. Dependências e lockfile são locais ao projeto. Não são necessários Docker, serviços externos ou chave de IA para esta fundação.

## Documentação

- [Plano aprovado](docs/PLANO_APROVADO.md) e [roadmap completo](docs/ROADMAP.md).
- [Arquitetura](docs/ARQUITETURA.md), [modelo de dados](docs/MODELO_DE_DADOS.md) e [regras financeiras](docs/REGRAS_FINANCEIRAS.md).
- [Contrato de sincronização](docs/SINCRONIZACAO.md) e [backup e restauração](docs/BACKUP_E_RESTAURACAO.md).
- [Segurança e RPC](docs/SEGURANCA_RPC.md), [custos e limites](docs/CUSTOS_E_LIMITES.md) e [referências](docs/REFERENCIAS_E_DECISOES.md).
- [Estado atual](docs/ESTADO_ATUAL.md) e [validação realizada](docs/VALIDACAO.md) registram o que foi efetivamente implementado e testado.

`database/modelo_inicial.sql` é uma referência de desenho relacional. Não foi aplicado em PostgreSQL, não configura Supabase e não está pronto para implantação.

As especificações privadas originais, dados reais, backups, comprovantes e segredos não devem integrar o histórico Git nem artefatos publicados. Este README e `docs/` descrevem somente decisões técnicas sanitizadas. Não há publicação ou configuração remota autorizada neste incremento.
