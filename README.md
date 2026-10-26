# Atlas Financeiro

Aplicação pessoal de gestão financeira com prioridade para celular Android, interface em português brasileiro, valores em BRL e datas financeiras no fuso `America/Fortaleza`.

Os **Incrementos 1 e 2** entregam uma aplicação financeira local verificável: domínio em centavos exatos, persistência Dexie, contas, categorias, receitas, despesas, transferências, reservas simples, edição/estorno imutáveis, dashboard, histórico, outbox, backup JSON e PWA offline. Autenticação, envio remoto e restauração completa pertencem aos incrementos seguintes.

## Desenvolvimento local

O projeto de aplicação está em `app/`. Nesse diretório, executar `npm ci`, `npm run dev` e `npm run check`. Dependências e lockfile são locais ao projeto. Não são necessários Docker, serviços externos, conta ou chave de IA para o uso local.

Requisitos: Node.js >= 22.12 e npm; os testes de navegador usam Microsoft Edge instalado. Desenvolvimento: `npm run dev`, em `http://127.0.0.1:5173`. Para testar a PWA, executar `npm run build` e `npm run preview`, em `http://127.0.0.1:4173`. Aguardar o primeiro carregamento online antes de testar offline. Esses dois endereços têm bases locais distintas; usar sempre o mesmo endereço para reencontrar seus dados.

Em **Backup**, o botão **Baixar backup** exporta JSON com histórico e outbox. Nesta branch de I3, a recuperação mínima autorizada aceita uma exportação I2 em origem/perfil vazio ou exatamente idêntico, sem unir/substituir bases. O arquivo inteiro é validado antes da gravação; IDs e pendências são preservados. Restauração completa e gerações permanecem em I4. Guardar a cópia fora do navegador e do aparelho.

**I3 em implementação local, ainda incompleto.** Recuperação mínima e fundação SQL com leitura isolada foram testadas localmente. Não há login Google, associação de conta ou envio remoto funcionando. `npm run check` também executa a migração em PostgreSQL embarcado PGlite com identidade simulada; isso não comprova Auth/API hospedados nem concorrência entre conexões. [Execução e limites](docs/EXECUCAO_INCREMENTO_3.md), [inventário](docs/INVENTARIO_BASES.md).

## Documentação

- [Plano aprovado](docs/PLANO_APROVADO.md) e [roadmap completo](docs/ROADMAP.md).
- [Arquitetura](docs/ARQUITETURA.md), [modelo de dados](docs/MODELO_DE_DADOS.md) e [regras financeiras](docs/REGRAS_FINANCEIRAS.md).
- [Contrato de sincronização](docs/SINCRONIZACAO.md) e [backup e restauração](docs/BACKUP_E_RESTAURACAO.md).
- [Segurança e RPC](docs/SEGURANCA_RPC.md), [custos e limites](docs/CUSTOS_E_LIMITES.md) e [referências](docs/REFERENCIAS_E_DECISOES.md).
- [Estado atual](docs/ESTADO_ATUAL.md) e [validação realizada](docs/VALIDACAO.md) registram o que foi efetivamente implementado e testado.
- [Diretrizes de interface](docs/DIRETRIZES_UI_UX.md) e [próxima etapa](docs/PROXIMA_ETAPA.md).
- [Plano de I3 aprovado com limites](docs/PLANO_INCREMENTO_3.md), [decisões e ações](docs/PENDENCIAS_INCREMENTO_3.md) e [fontes oficiais](docs/REFERENCIAS_INCREMENTO_3.md). Implementação local autorizada; serviços remotos, OAuth, publicação e dados reais exigem autorizações específicas.

`database/modelo_inicial.sql` é uma referência de desenho relacional. Não foi aplicado em PostgreSQL, não configura Supabase e não está pronto para implantação.

As especificações privadas originais, dados reais, arquivos de backup, comprovantes e segredos não devem integrar o histórico Git nem artefatos publicados. Este README e `docs/` descrevem somente decisões técnicas sanitizadas. Não há publicação ou configuração remota autorizada.
